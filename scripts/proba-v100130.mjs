// Proba v100.130 (07.10, el: „crypto continua si fa ideile”): ideile rămase după v100.129 -
// (1) recentele și scurtăturile țin felul (coin / acțiune): BE din poziție nu mai ajunge pe Pionex; (2) variantele botului comparate
// drum cu drum (în câte drumuri e mai bună), nu doar pe mijloc; (3) în Salt, la stopul DEPĂȘIT, șansa să revină la intrare (Monte Carlo);
// (4) la acțiuni, stop −5 / −8 / −10 / −15% pe aceleași drumuri; (5) în Salt, stopul și ținta pentru instrumentele din liste, socotite pe pagină.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "profil-moneda.js", "probabilitati.js", "semnale-bot.js", "consiliu.js", "actiuni-semnale.js", "consilier.js", "risc-luna.js", "t212.js", "salt.js", "monte-simbol.js"])
  vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
const MSE = citeste("public", "lib", "monte-simbol-ecran.js"), SE = citeste("public", "lib", "salt-ecran.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const M = globalThis.MonteSimbol, G = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.130 · Monte Carlo + Salt: ideile rămase · proba\n");
const ZI = 864e5;
function bareZi(n, seed, pas) { const g = M.generator(seed), b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.06)); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v: 1 }); } return b; }
function bare15(zile, seed) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }

// ---------------- (1) recentele țin felul ----------------
await test("(1a) recentele țin felul: {s, tip}; cele vechi (doar text) rămân fără fel; același simbol ⇒ felul nou, fără dubluri", () => {
  assert.deepEqual(G.mcsRecente(["AAPL", { s: "PONS", tip: "coin" }], "BE", "stock"), [{ s: "BE", tip: "stock" }, { s: "AAPL", tip: null }, { s: "PONS", tip: "coin" }]);
  assert.deepEqual(G.mcsRecente([{ s: "BE", tip: "coin" }, "AAPL"], "BE", "stock"), [{ s: "BE", tip: "stock" }, { s: "AAPL", tip: null }]);
  assert.deepEqual(G.mcsRecente([{ s: "<b>", tip: "coin" }, { s: "X", tip: "altceva" }], ""), [{ s: "X", tip: null }]);
  assert.equal(G.mcsRecente(Array.from({ length: 15 }, (_, i) => ({ s: "S" + i, tip: "coin" })), "X", "coin").length, 10);
});
await test("(1b) caseta: butonul unei acțiuni trimite felul (mcsAlege('BE','stock')) și scrie „acț.”; coinul trimite 'coin'; cele vechi, doar simbolul", () => {
  const h = G.mcsHtml({ recente: [{ s: "BE", tip: "stock" }, { s: "PONS", tip: "coin" }, "AAPL"], scurtaturi: [{ s: "NFLX", tip: "stock" }, { s: "LIT", tip: "coin" }] });
  assert.match(h, /mcsAlege\('BE','stock'\)[^>]*>BE<small>acț\.<\/small><\/button>/);
  assert.match(h, /mcsAlege\('PONS','coin'\)/); assert.match(h, /mcsAlege\('AAPL'\)/);
  assert.match(h, /mcsAlege\('NFLX','stock'\)/); assert.match(h, /mcsAlege\('LIT','coin'\)/);
});
await test("(1c) mcsAlege(…, 'stock') nu caută pe Pionex (BE e și monedă); 'coin' caută doar pe Pionex; fără fel, ca înainte", async () => {
  const apeluri = [], vechi = { c: G.mcsAduCoin, s: G.mcsAduStock, a: G.mcsArhiva, j: G.getJSON };
  G.mcsAduCoin = async (s) => { apeluri.push("coin:" + s); return null; };
  G.mcsAduStock = async (s, exact) => { apeluri.push("stock:" + s + ":" + exact); return { sim: s, b: bareZi(300, 5) }; };
  G.mcsArhiva = async () => []; G.getJSON = async () => ({ umpleri: [] });
  try {
    await G.mcsAlege("BE", "stock");
    assert.deepEqual(apeluri, ["stock:BE:true"]); assert.equal(G.mcsStare.rez.tip, "stock");
    assert.deepEqual(G.mcsStare.recente[0], { s: "BE", tip: "stock" });
    apeluri.length = 0; await G.mcsAlege("BE", "coin");
    assert.deepEqual(apeluri, ["coin:BE"]); assert.match(G.mcsStare.eroare, /Pionex/);
    apeluri.length = 0; await G.mcsAlege("BE");
    assert.deepEqual(apeluri, ["coin:BE", "stock:BE:false"]);
  } finally { G.mcsAduCoin = vechi.c; G.mcsAduStock = vechi.s; G.mcsArhiva = vechi.a; G.getJSON = vechi.j; }
});
await test("(1d) scurtăturile: boții = coin, pozițiile T212 / Salt = acțiune", () => {
  assert.match(functie(MSE, "mcsScurtaturi"), /tip: "coin"/); assert.match(functie(MSE, "mcsScurtaturi"), /tip: "stock"/);
});

// ---------------- (2) variantele drum cu drum ----------------
await test("(2a) mcsDrumCuDrum: în câte drumuri e mai bună / mai rea / la fel (sub 1 cent = la fel)", () => {
  assert.deepEqual(G.mcsDrumCuDrum([1, 2, 3, 4], [1.5, 2.004, 2, 4]), { maiBun: 0.25, maiRau: 0.25, egal: 0.5 });
  assert.equal(G.mcsDrumCuDrum(null, [1]), null); assert.equal(G.mcsDrumCuDrum([1, 2], [1]), null);
});
await test("(2b) grid cu peDrum: rezultatele pe drumuri, în ordinea drumurilor (nu sortate); aceleași setări ⇒ aceleași drumuri", () => {
  const b = bare15(20, 3), st = { pret: 1, jos: 0.92, sus: 1.08, grile: 20, levier: 2, dir: "long", suma: 50, stop: null };
  const a = M.grid(b, st, { zile: 7, n: 60, seed: 12, peDrum: true, faraCuTendinta: true }), c = M.grid(b, st, { zile: 7, n: 60, seed: 12, peDrum: true, faraCuTendinta: true });
  assert.equal(a.drumuri.length, 60); assert.deepEqual(a.drumuri, c.drumuri);
  const s = a.drumuri.slice().sort((x, y) => x - y); assert.equal(s[30], a.p50); assert.notDeepEqual(a.drumuri, s, "ordinea drumurilor, nu sortată");
  assert.equal(M.grid(b, st, { zile: 7, n: 60, seed: 12 }).drumuri, undefined, "fără peDrum nu le ține");
});
await test("(2c) variantele: fiecare are „drum cu drum” față de al tău (din aceleași drumuri), tabelul are coloana", () => {
  const b = bare15(20, 3), st = { jos: 0.92, sus: 1.08, grile: 20, levier: 2, dir: "long", suma: 50, stop: null, botulTau: true };
  const rows = G.mcsCalcVariante(b, st, 1, { n: 60 });
  assert.equal(rows[0].drum, undefined);
  rows.slice(1).forEach((x) => { assert.ok(x.drum, x.nume); assert.ok(Math.abs(x.drum.maiBun + x.drum.maiRau + x.drum.egal - 1) < 1e-9); });
  const h = G.mcsVarHtml({ setari: st, variante: rows });
  assert.match(h, /<th>Drum cu drum<\/th>/); assert.match(h, /mai bun în \d+%/);
});
await test("(2d) „ce aș face eu”: o variantă mai bună pe mijloc dar mai rea în mai multe drumuri decât mai bună NU se recomandă", () => {
  const g = (p50, p5, pPlus) => ({ p50, p5, pPlus, pLichidare: 0 });
  const baza = { nume: "așa cum e", st: { suma: 50 }, g: g(0, -5, 0.5) };
  const r1 = [baza, { nume: "levier mai mare", st: {}, g: g(3, -5, 0.5), drum: { maiBun: 0.3, maiRau: 0.6, egal: 0.1 } }];
  assert.match(G.mcsVariantaBuna(r1), /Păstrează-l așa/);
  const r2 = [baza, { nume: "levier mai mare", st: {}, g: g(3, -5, 0.5), drum: { maiBun: 0.7, maiRau: 0.2, egal: 0.1 } }];
  assert.match(G.mcsVariantaBuna(r2), /Aș încerca „levier mai mare”.*mai bună decât a ta în 70% din drumuri/);
});
await test("(2e) două variante bune cu mijlocul la fel în limita pragului ⇒ câștigă cea mai bună drum cu drum (PONS 07.10: ½ grile 99% vs levier mai mic 72%)", () => {
  const g = (p50, p5, pPlus) => ({ p50, p5, pPlus, pLichidare: 0 });
  const baza = { nume: "așa cum e", st: { suma: 47.83 }, g: g(-5.8, -9.2, 0.28) };
  const lev = { nume: "levier mai mic", st: {}, g: g(-3.9, -6.1, 0.28), drum: { maiBun: 0.72, maiRau: 0.28, egal: 0 } };
  const gr = { nume: "jumătate din grile", st: {}, g: g(-4.2, -8.8, 0.32), drum: { maiBun: 0.99, maiRau: 0.01, egal: 0 } };
  assert.match(G.mcsVariantaBuna([baza, lev, gr]), /Aș încerca „jumătate din grile”/);
  const lev2 = Object.assign({}, lev, { g: g(-2.5, -6.1, 0.28) });   // mijlocul mai bun cu peste prag ⇒ rămâne mijlocul
  assert.match(G.mcsVariantaBuna([baza, lev2, gr]), /Aș încerca „levier mai mic”/);
});

// ---------------- (4) stopuri pe aceleași drumuri (acțiuni) ----------------
await test("(4a) MonteSimbol.pret cu stopuri: pe fiecare orizont, un rând pe stop; stopul mai larg e atins întâi mai rar; ieșirea la stop nu e peste nivel (gap)", () => {
  const b = bareZi(400, 9, 0.05), r = M.pret(b, { orizonturi: [20, 60], n: 400, seed: 21, stopPct: 0.1, tintaPct: 0.15, stopuri: [0.05, 0.08, 0.1, 0.15] });
  r.orizonturi.forEach((o) => {
    assert.equal(o.stopuri.length, 4);
    for (let i = 1; i < 4; i++) assert.ok(o.stopuri[i].pStop <= o.stopuri[i - 1].pStop + 1e-12, "stop mai larg ⇒ atins întâi mai rar");
    o.stopuri.forEach((s) => { assert.ok(Math.abs(s.pStop + s.pTinta + s.pNiciuna - 1) < 1e-9); assert.ok(s.p5 <= s.p50); assert.ok(isFinite(s.media)); });
  });
  const o10 = r.orizonturi[1].stopuri[2]; assert.equal(o10.sp, 0.1); assert.equal(o10.pStop, r.orizonturi[1].pStop, "−10% = același număr ca rândul stopului de sus");
  assert.equal(M.pret(b, { orizonturi: [20], n: 50 }).orizonturi[0].stopuri, undefined);
});
await test("(4b) caseta acțiunii: tabelul „alt stop, aceleași drumuri” cu −5/−8/−10/−15%, stopul tău marcat; la coin nu", () => {
  const b = bareZi(400, 9, 0.05), d = { tip: "stock", sim: "RHM.DE", sursa: "x", b, ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, { stop: 12 });
  const ul = r.pretMc.orizonturi[r.pretMc.orizonturi.length - 1].stopuri.map((s) => Math.round(s.sp * 100));
  assert.deepEqual(ul, [5, 8, 10, 12, 15], "stopul lui (12%) intră între ele");
  const h = G.mcsPretHtml(r);
  assert.match(h, /Alt stop, aceleași drumuri/); assert.match(h, /<tr class="mcsVarTu"><td>−12,0%/); assert.match(h, /Ce aș face eu:/);
  assert.doesNotMatch(G.mcsPretHtml(Object.assign({}, r, { tip: "coin" })), /Alt stop, aceleași drumuri/);
});
await test("(4c) recomandarea stopului: media aproape aceeași (sub 1 punct) ⇒ păstrează stopul de sus și spune ce schimbă stopul; altfel cel cu media clar mai bună", () => {
  // proba pe RHM.DE 07.10: stopul întâi ≈ ținta / (stop + țintă) - o cursă fără avantaj; „cel mult o treime” cerea doar un stop de 2× ținta
  const s = (sp, pStop, media, p5) => ({ sp, pStop, pTinta: 1 - pStop, pNiciuna: 0, media, p5, p50: 0 });
  const rows = [s(0.046, 0.71, -0.005, -0.057), s(0.05, 0.69, -0.006, -0.064), s(0.1, 0.53, -0.009, -0.108), s(0.15, 0.41, -0.011, -0.165)];
  const t = G.mcsStopRecomandat(rows, 60, 0.046);
  assert.match(t, /^Păstrează stopul de sus \(−4,6%\)/); assert.match(t, /între −1,1% și −0,5%/); assert.match(t, /71% la −4,6%.*41% la −15,0%/); assert.match(t, /−5,7%.*−16,5%/);
  assert.doesNotMatch(t, /o treime/);
  const r2 = [s(0.05, 0.6, -0.03, -0.06), s(0.1, 0.5, -0.001, -0.1), s(0.15, 0.4, -0.012, -0.16)];
  assert.match(G.mcsStopRecomandat(r2, 60, 0.05), /^Aș lua −10,0%: rezultatul mediu −0,1%, față de −3,0% la stopul de sus/);
});

// ---------------- (3) Salt: stopul depășit ⇒ șansa să revină la intrare ----------------
await test("(3a) saltSansaRevenire: doar când stopul e depășit și prețul e sub intrare; aceleași drumuri ca 🎲 Monte Carlo pe poziție", () => {
  const b = bareZi(400, 9, 0.05), P = b[b.length - 1].c;
  const a = { p: { pret: P, pretMediu: P * 1.3 }, niv: { stopPozitie: P * 1.1 } };
  const r = G.saltSansaRevenire(b, a);
  assert.equal(r.zile, 60); assert.ok(r.p >= 0 && r.p <= 1); assert.ok(r.pCapat <= r.p);
  const mc = G.mcsCalculeaza({ tip: "stock", sim: "X", b, ist: {} }, { poz: { sim: "X", pret: P, intrare: P * 1.3, stop: P * 1.1 } });
  assert.equal(r.p, mc.pretMc.orizonturi[1].pIntrare, "același număr ca pagina Monte Carlo");
  assert.equal(G.saltSansaRevenire(b, { p: { pret: P, pretMediu: P * 1.3 }, niv: { stopPozitie: P * 0.9 } }), null, "stopul neatins");
  assert.equal(G.saltSansaRevenire(b, { p: { pret: P, pretMediu: P * 0.9 }, niv: { stopPozitie: P * 1.1 } }), null, "pe plus");
  assert.equal(G.saltSansaRevenire(b.slice(0, 30), a), null, "prea puțin istoric");
});
await test("(3b) rândul Salt cu stopul DEPĂȘIT arată șansa; detaliul o spune în cuvinte; saltAnalizeazaUna o calculează", () => {
  const poz = { isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall", qty: 1.0456, pretMediu: 1349.6, de: "2026-05-11", plata: "EUR" };
  const a = { p: { pret: 936.6, pretMediu: 1349.6 }, niv: { stopPozitie: 1109.1, tintaPozitie: 1436.5 }, cons: { nivel: "iesi", titlu: "x" }, st: { trend: { dir: "jos" } }, revine: { p: 0.13, pCapat: 0.07, zile: 60 } };
  const h = G.saltPozRandHtml({ a, p: poz, m: "EUR", pret: 936.6, fx: 1, rez: -400, pct: -0.3, cost: 1411, val: 979, pond: 1 }, { deschis: {}, incarcate: true });
  assert.match(h, /DEPĂȘIT<\/span><span class="t212Mic">🎲 revine la intrare: 13% în 60 z<\/span>/);
  assert.match(h, /Șansa să revină la prețul tău de intrare \(1\.349,60 EUR\) măcar o dată în 60 de zile de bursă: <b>13%<\/b>; la capăt peste intrare: 7%/);
  assert.match(functie(SE, "saltAnalizeazaUna"), /saltSansaRevenire\(b, a\)/);
});

// ---------------- (5) Salt: stop / țintă pe listele „Început de urcare / Revers / Pe revenire” ----------------
await test("(5a) saltNivLista: stopul și ținta Radarului pentru o intrare azi (ActiuniSemnale.niveluri), prețul de acum", () => {
  const b = bareZi(300, 4, 0.04), n = G.saltNivLista(b), A = ActiuniSemnale.niveluri(b, b[b.length - 1].c, {});
  assert.equal(n.stop, A.stop); assert.equal(n.tinta, A.tinta); assert.equal(n.pret, b[b.length - 1].c); assert.equal(n.trend, A.trend);
  assert.ok(G.saltNivLista(b.slice(0, 50)).eroare);
});
await test("(5b) lista: coloanele Stop / Țintă; în curs ⇒ „…”, fără date ⇒ „—”; trend în jos ⇒ se spune", () => {
  const d = { raport: { liste: { revers: [{ simbol: "AAA", nume: "A", pret: 10, cadere: 0.2 }, { simbol: "BBB", pret: 5, cadere: 0.3 }, { simbol: "CCC", pret: 7, cadere: 0.25 }] }, dovada: {} }, fila: "revers",
    nivListe: { AAA: { pret: 10, stop: 9.2, tinta: 11.6, riscPct: 0.08, trend: "jos" }, CCC: { eroare: "prea puține zile" } } };
  const h = G.saltIdeiHtml(d);
  assert.match(h, /<th>Stop<\/th><th>Țintă<\/th>/);
  assert.match(h, /9,20<span class="t212Mic">−8,0%<\/span>/); assert.match(h, /11,60/); assert.match(h, /trend în jos: doar dacă se întoarce/);
  assert.match(h, /BBB[\s\S]*?<td class="tbSub">…<\/td>/); assert.match(h, /CCC[\s\S]*?<td class="tbSub">—<\/td>/);
});
await test("(5c) fila aleasă pornește calculul (saltFila ⇒ saltNivelePeLista), și la deschiderea paginii pe o listă", () => {
  assert.match(functie(SE, "saltFila"), /saltNivelePeLista\(/);
  assert.match(functie(SE, "saltPorneste"), /saltNivelePeLista\(/);
  assert.match(functie(SE, "saltNivelePeLista"), /saltBareDe\(/); assert.match(functie(SE, "saltNivelePeLista"), /saltDeseneazaIdei\(\)/);
});

await test("(E) versiunea de la v100.130 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3\d|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3\d|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3\d|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3\d|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3\d|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3\d|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3\d|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
