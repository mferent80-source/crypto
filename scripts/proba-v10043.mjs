// Proba v100.43 (30.09, el: „ok fă în ordine primele 4”, apoi „da” pe designul scurt). Primele trei din I-465..I-468:
// I-466 increderea fiecarui sfat, masurata pe TOTI botii: judecata la INCHIDEREA botului sau la 24 h (ce vine intai - hotararea lui;
//       masurat inainte: 109 semnale pe 13 boti, doar 7 judecate, fiindca botii se inchid inainte de 24 h); socoteala adunata; sub 10
//       cazuri „încă nu știm”; dupa >=30 un sfat care nu bate hazardul si n-a salvat bani TACE pe Discord (ramane in Radar).
// I-468 frana contului: −20 USDT/zi (ora Romaniei), −60 pe 7 zile, 3 inchise pe minus la rand (pragurile lui, schimbabile din pagina);
//       netul inchisilor + pierderea celor deschisi; avertizeaza (alerta o data pe zi + rand in poarta), nu blocheaza.
// I-467 „ce as face eu” cu banii pe masa: cartelele Stopul / Gridul primesc cel mai rau caz in USDT si ce cedezi.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)(); globalThis.GridProba = GP;
const JT = new Function(`${lib("jurnal-trade.js")}; return JurnalTrade;`)(); globalThis.JurnalTrade = JT;
const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)(); globalThis.TabloExtra = TE;
const SB = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)();
const AL = new Function(`${lib("alerte.js")}; return Alerte;`)();
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT);
const colector = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
const server = fs.readFileSync(path.join(RAD, "functions", "api", "istoric-bot.js"), "utf8");
const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, (m || "") + " " + a + " != " + b);
const ORA = 3600000, ZI = 24 * ORA, T0 = Date.UTC(2026, 8, 30, 8);
console.log("\nV100.43 · increderea sfaturilor, frana contului, „ce as face eu” in USDT · proba\n");

// ---------------- I-466 ----------------
await test("I-466 judecaLaInchidere: IESI/ATENTIE au dreptate daca iesind atunci pastrai mai mult decat la final; TINE invers; cifra in USDT", () => {
  assert.equal(typeof SB.judecaLaInchidere, "function");
  const log = [
    { t: T0, cod: "muta", nivel: "atentie", total: -2, dreptate: null },          // la final −6 -> iesind la −2 salvai 4 -> dreptate
    { t: T0 + ORA, cod: "tine", nivel: "tine", total: -3, dreptate: null },       // final −6 < −3 -> TINE a gresit
    { t: T0 + 2 * ORA, cod: "btc", nivel: "atentie", total: -7, dreptate: null }, // final −6 > −7 -> iesirea n-ar fi salvat -> gresit
    { t: T0 + 3 * ORA, cod: "costuri", nivel: "atentie", total: -1, dreptate: true, totalDupa: -2 },   // deja judecat -> neatins
  ];
  const j = SB.judecaLaInchidere(log, -6, 100, T0 + 5 * ORA);
  assert.deepEqual(j.map((e) => e.dreptate), [true, false, false, true]);
  assert.equal(j[0].totalDupa, -6); assert.equal(j[0].laInchidere, true); assert.equal(j[3].laInchidere, undefined);
  const s = SB.socoteala(j);
  aprox(s.muta.bani, 4, 1e-9, "muta a salvat 4"); aprox(s.tine.bani, -3, 1e-9, "tine a costat 3");
});

await test("I-466 socotealaToti: pe TOTI botii, cu marja de incredere; <10 judecate „încă nu știm”; >=30 fara avantaj si fara bani -> tace (nu lichidare/plan)", () => {
  assert.equal(typeof SB.socotealaToti, "function");
  const mk = (cod, nivel, k, n, bani) => Array.from({ length: n }, (_, i) => ({ t: T0 + i, cod, nivel, total: 0, totalDupa: i < k ? -bani : bani, dreptate: i < k }));
  const s = SB.socotealaToti([mk("muta", "atentie", 12, 32, 1), mk("btc", "atentie", 3, 5, 1), mk("costuri", "atentie", 28, 32, 1), mk("lichidare", "iesi", 5, 40, 1)]);
  assert.equal(s.btc.stare, "necunoscut"); assert.match(SB.textIncredere(s.btc), /încă nu știm \(5 judecate\)/);
  assert.equal(s.muta.stare, "tace", "12 din 32 si bani pe minus"); assert.equal(s.muta.judecate, 32);
  assert.equal(s.costuri.stare, "ajuta"); assert.ok(s.costuri.ic[0] > 0.5);
  assert.notEqual(s.lichidare.stare, "tace", "lichidarea si planul lui nu tac niciodata");
  assert.match(SB.textIncredere(s.costuri), /a avut dreptate 28 din 32 \(88%\)/);
  assert.deepEqual(SB.tacute(s), { muta: true });
});

await test("I-466 alertele unui sfat tacut raman doar in Radar (Discord nu), cu cifra lui; lichidarea nu tace", () => {
  const b = { id: "1", baza: "CRV.PERP", directie: "long", levier: 5, investit: 100, profitTotal: -1, pretCurent: 0.386, gridJos: 0.3755, gridSus: 0.423, distantaLichidarePct: 19 };
  const ctx = { taci: { muta: true }, semnale: { semafor: { nivel: "tine" }, muta: { nivel: "atentie", motiv: "prețul stă la marginea de jos", des: true, setare: { dir: "long", jos: 0.38, sus: 0.42, grile: 5, levier: 5 } } } };
  const r = AL.evalueaza(b, ctx, {}, T0);
  const m = r.mesaje.find((x) => x.cheie === "s-muta");
  assert.ok(m, "mesajul exista (in Radar)"); assert.equal(m.doarRadar, true);
  const r2 = AL.evalueaza(b, { semnale: ctx.semnale }, {}, T0);
  assert.ok(!r2.mesaje.find((x) => x.cheie === "s-muta").doarRadar, "fara socoteala: pleaca pe Discord");
});

await test("I-466 colectorul: judeca la inchidere, aduna socoteala tuturor (actiunea „socoteala”), tace pe Discord ce e tacut; serverul pastreaza laInchidere", () => {
  assert.match(colector, /SemnaleBot\.judecaLaInchidere\(/); assert.match(colector, /async function turaSocoteala\(/);
  assert.match(colector, /action=socoteala/); assert.match(colector, /ctx\.taci = socotealaTaci;/);
  assert.match(server, /if\(action==="socoteala"\)/); assert.match(server, /laInchidere:e\.laInchidere===true/);
  assert.match(app, /action=socoteala/); assert.match(app, /SemnaleBot\.textIncredere\(/);
});

// ---------------- I-468 ----------------
const tr = (net, inchis, pornit) => ({ id: String(inchis), moneda: "X", net, rezultat: net, inchis, pornit: pornit || inchis - ORA, comisioane: 0, funding: 0 });
await test("I-468 frana: −20/zi pe ziua Romaniei (inchisi + pierderea celor deschisi), −60 pe 7 zile, 3 pe minus la rand; sub praguri - nimic", () => {
  assert.equal(typeof OB.frana, "function");
  const acum = Date.UTC(2026, 8, 30, 18);   // 21:00 RO
  const P = { zi: 20, sapt: 60, rand: 3 };
  const ok = OB.frana({ trades: [tr(-5, acum - 2 * ORA), tr(3, acum - 3 * ORA)], deschise: [{ profitTotal: -4, activ: true }], acum, praguri: P });
  aprox(ok.netZi, -6, 1e-9, "−5 + 3 − 4 deschis"); assert.equal(ok.activa, false);
  const zi = OB.frana({ trades: [tr(-15, acum - 2 * ORA), tr(-2, acum - 3 * ORA)], deschise: [{ profitTotal: -5, activ: true }], acum, praguri: P });
  assert.equal(zi.activa, true); assert.ok(zi.depasit.some((d) => d.cod === "zi")); assert.match(zi.text, /gata pe azi/i);
  // ieri 23:30 RO nu intra in azi (ziua Romaniei, nu UTC)
  const ieri = OB.frana({ trades: [tr(-25, Date.UTC(2026, 8, 29, 20, 30))], deschise: [], acum, praguri: P });
  assert.equal(ieri.depasit.some((d) => d.cod === "zi"), false);
  const sapt = OB.frana({ trades: [tr(-19, acum - 2 * ZI), tr(-19, acum - 3 * ZI), tr(-19, acum - 4 * ZI), tr(10, acum - 5 * ZI)], deschise: [], acum, praguri: { zi: 20, sapt: 40, rand: 5 } });
  assert.ok(sapt.depasit.some((d) => d.cod === "sapt"));
  const rand = OB.frana({ trades: [tr(-1, acum - ORA), tr(-1, acum - 2 * ORA), tr(-1, acum - 3 * ORA), tr(5, acum - 4 * ORA)], deschise: [], acum, praguri: P });
  assert.ok(rand.depasit.some((d) => d.cod === "rand")); assert.equal(rand.rand, 3);
});

await test("I-468 poarta: randul „frana contului” pica cand frana e activa (avertizeaza, nu blocheaza pornirea pe hartie)", () => {
  const f = { simbol: "CRV_USDT_PERP", verdict: { nivel: "porneste", motive: [] }, dir: "long", setare: { levierSigur: 5 } };
  const p = OB.poarta({ fisa: f, trades: [], acum: T0, frana: { activa: true, text: "Frâna contului: gata pe azi (−23,40 USDT azi)." } });
  const r = p.reguli.find((x) => x.cod === "frana"); assert.ok(r && r.ok === false, JSON.stringify(p.reguli.map((x) => x.cod)));
  assert.equal(OB.poarta({ fisa: f, trades: [], acum: T0, frana: { activa: false, text: "ok" } }).reguli.find((x) => x.cod === "frana").ok, true);
});

await test("I-468 cat ar fi economisit pe istorie: botii porniti DUPA ce frana suna in ziua aceea (ipoteza, pe inchisi)", () => {
  assert.equal(typeof OB.franaIstoric, "function");
  const d = Date.UTC(2026, 8, 10, 8);
  const l = [tr(-21, d + 2 * ORA, d + ORA), tr(-8, d + 5 * ORA, d + 3 * ORA), tr(4, d + 7 * ORA, d + 6 * ORA), tr(-3, d + ZI + 2 * ORA, d + ZI + ORA)];
  const r = OB.franaIstoric(l, { zi: 20, sapt: 1000, rand: 99 });
  assert.equal(r.sarite, 2, "dupa −21 in aceeasi zi: −8 si +4 nu mai porneau; a doua zi da");
  aprox(r.economisit, 4, 1e-9, "8 − 4");
});

await test("I-468 colectorul: frana o data pe zi pe Discord; pragurile in configurare (server + campuri in pagina)", () => {
  assert.match(colector, /async function turaFrana\(/); assert.match(colector, /Obiceiuri\.frana\(/);
  assert.match(server, /corp\.frana/); assert.match(app, /id="grFranaZi"/); assert.match(app, /Obiceiuri\.franaIstoric\(/);
});

// ---------------- I-467 ----------------
await test("I-467 cifreActiuni: stopul - pierderea maxima acum (la opritorul tau) vs cu stopul propus, si cat de des l-ar atinge o zi obisnuita", () => {
  assert.equal(typeof TE.cifreActiuni, "function");
  // botul LIGHTER din 29.09 (forma rutei): long 5x, 103,38 USDT, grid 4,085–4,837, 16 linii, 7 LIT/linie, opritor la 3,787
  const b = { directie: "long", investit: 103.38, profitNet: -0.5, profitTotal: -2, pozitie: 56, pretDeschidere: 4.484, pretCurent: 4.40, gridJos: 4.085, gridSus: 4.837,
    opritorPierdere: 3.787, opritorPierdereActiv: true, brut: { buOrderData: { row: 16, perVolume: 7, gridType: "geometric" } } };
  const bare = []; for (let i = 0; i < 30 * 96; i++) { const m = 4.4 * (1 + 0.03 * Math.sin(i / 40)); bare.push({ t: i * 900000, o: m, h: m * 1.004, l: m * 0.996, c: m }); }
  const c = TE.cifreActiuni(b, { protectie: 4.02, b15: bare });
  assert.ok(c.stop.laOpritor < -40, "la opritorul lui pierde mult: " + c.stop.laOpritor);
  assert.ok(c.stop.laPropus > c.stop.laOpritor, "cu stopul propus pierde mai putin");
  assert.ok(c.stop.frecventa !== null && c.stop.frecventa >= 0 && c.stop.frecventa <= 1, "cat de des e atins pe o zi: " + c.stop.frecventa);
  assert.match(TE.textBani(c.stop), /pierderea maximă: .* → /);
  assert.ok(c.inchide && c.inchide.iei !== null);
});

await test("I-467 acumConcret: cartela Stopul poarta cifrele in USDT; textul vechi „piață liniștită: grid des” a disparut (gridul des e mereu)", () => {
  const src = lib("semnale-bot.js");
  assert.doesNotMatch(src, /piață liniștită: grid des 0,3%/);
  const b = { directie: "long", pretCurent: 4.40, gridJos: 4.085, gridSus: 4.837, profitTotal: -2 };
  const r = SB.acumConcret({ bot: b, fisa: null, zero: { pretZero: 4.5 }, bani: { stop: { laOpritor: -63.2, laPropus: -15.7, frecventa: 0.18 } } });
  const st = r.find((x) => x.cod === "stop"); assert.ok(st && /63/.test(st.bani || "") && /15,7|15\.7/.test(st.bani), JSON.stringify(st));
});

await test("I-467 opritorul LUI deja mai strans decat propunerea: nu-l impinge spre un stop mai larg (pe viu, CRV: −10,2 vs −21,0)", () => {
  const b = { directie: "long", pretCurent: 0.38, gridJos: 0.3755, gridSus: 0.423, profitTotal: -2 };
  const r = SB.acumConcret({ bot: b, fisa: null, zero: { pretZero: 0.40 }, bani: { stop: { laOpritor: -10.2, laPropus: -21, frecventa: 0.12 } } });
  const st = r.find((x) => x.cod === "stop"); assert.match(st.bani, /l-aș lăsa unde e/); assert.doesNotMatch(st.bani, /→/);
});

console.log(`\nV100.43 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
