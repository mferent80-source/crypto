// Proba v100.132 (07.10, el: „fa idei” după v100.131): (1) stopurile pe aceleași drumuri după ATR (1×, 1,5×, 2×, 3× agitația zilnică),
// nu în % fix; (2) ținta (TP) botului grid: citită din Pionex, în formular, și „Compară ținte (TP)” pe aceleași drumuri; (3) „🎲 revine
// la intrare” din rândul T212 / Salt e un buton care deschide Monte Carlo pe poziție.
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
const MSE = citeste("public", "lib", "monte-simbol-ecran.js"), TE = citeste("public", "lib", "t212-ecran.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const M = globalThis.MonteSimbol, G = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.132 · stop după ATR · TP-ul botului grid · 🎲 din rând · proba\n");
const ZI = 864e5;
function bareZi(n, seed, pas) { const g = M.generator(seed), b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.06)); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v: 1 }); } return b; }
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const bot = (o) => Object.assign({ activ: true, baza: "PONS.PERP", gridJos: 0.38, gridSus: 0.44, levier: 3, directie: "long", investit: 47.83, opritorPierdereActiv: true, opritorPierdere: 0.36, opritorProfitActiv: true, opritorProfit: 0.47, brut: { buOrderData: { row: 30 } } }, o);

// ---------------- (1) stopul după ATR ----------------
await test("(1a) mcsAtrPct: ATR pe 14 zile / prețul de acum; prea puține bare ⇒ null", () => {
  const b = bareZi(300, 9, 0.05), A = ActiuniSemnale.atr(b), P = b[b.length - 1].c;
  assert.equal(G.mcsAtrPct(b), A[b.length - 1] / P);
  assert.equal(G.mcsAtrPct(b.slice(0, 10)), null);
});
await test("(1b) acțiune: stopurile = 1×, 1,5×, 2×, 3× ATR + stopul de sus; fiecare rând scrie câte ATR e", () => {
  const b = bareZi(400, 9, 0.05), a = G.mcsAtrPct(b), r = G.mcsCalculeaza({ tip: "stock", sim: "X", b, ist: { r: { cazuri: 0 } } }, { stop: 12 });
  const sl = r.pretMc.orizonturi[1].stopuri.map((s) => s.sp), asteptat = [1, 1.5, 2, 3].map((k) => Math.min(0.5, Math.max(0.005, k * a))).concat([0.12]).sort((x, y) => x - y);
  assert.deepEqual(sl.map((x) => +x.toFixed(9)), asteptat.map((x) => +x.toFixed(9)));
  assert.equal(r.pretMc.atrPct, a);
  const h = G.mcsPretHtml(r);
  assert.match(h, /Alt stop, aceleași drumuri \(60 de zile de bursă, ținta \+[\d,]+%; ATR [\d,]+% pe zi\)/);
  assert.match(h, /<td>−[\d,]+%<span class="t212Mic">2× ATR<\/span><\/td>/); assert.match(h, /<td>−12,0%<span class="t212Mic">cel de sus · [\d,]+× ATR<\/span>/);
});
await test("(1c) coin cu bare zilnice: tot după ATR; coin doar pe 15 minute: % fix (−5/−10/−15/−20%), fără „ATR”", () => {
  const d = { tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: bareZi(120, 4, 0.08), ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, {});
  assert.ok(r.pretMc.atrPct > 0); assert.match(G.mcsPretHtml(r), /× ATR/);
  const r2 = G.mcsCalculeaza(Object.assign({}, d, { b1: [] }), {});
  assert.deepEqual(r2.pretMc.orizonturi[1].stopuri.map((s) => Math.round(s.sp * 100)), [5, 10, 15, 20]);
  assert.doesNotMatch(G.mcsPretHtml(r2), /× ATR/);
});

// ---------------- (2) TP-ul botului grid ----------------
await test("(2a) mcsSetariBot citește TP-ul (opritorProfit) la long și la short; la neutru nu", () => {
  assert.equal(G.mcsSetariBot([bot({})], "PONS").tp, 0.47);
  assert.equal(G.mcsSetariBot([bot({ directie: "short", opritorPierdere: 0.46, opritorProfit: 0.35 })], "PONS").tp, 0.35);
  assert.equal(G.mcsSetariBot([bot({ opritorProfitActiv: false })], "PONS").tp, null);
  assert.equal(G.mcsSetariBot([bot({ directie: "neutral" })], "PONS").tp, null);
});
await test("(2b) MonteSimbol.grid cu tp: închide pe partea profitului; pTp separat de pStop (atingerea TP nu e „stop atins”)", () => {
  const b = bare15(20, 3, 0.012), st = { pret: 1, jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 } };
  const fara = M.grid(b, st, { zile: 7, n: 120, seed: 12, faraCuTendinta: true }), cu = M.grid(b, Object.assign({}, st, { tp: 1.035 }), { zile: 7, n: 120, seed: 12, faraCuTendinta: true });
  assert.equal(fara.pTp, 0); assert.ok(cu.pTp > 0.2, "TP aproape de marginea de sus ⇒ atins des: " + cu.pTp);
  assert.ok(cu.pStop <= fara.pStop + 1e-12, "un drum închis la TP nu mai poate atinge stopul");
  const sh = M.grid(b, { pret: 1, jos: 0.97, sus: 1.05, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: 1.1 }, tp: 0.965 }, { zile: 7, n: 120, seed: 12, faraCuTendinta: true });
  assert.ok(sh.pTp > 0.2, "short: TP sub grid: " + sh.pTp);
});
await test("(2c) mcsTinteBot: fără TP, la margine, +¼, +½, +1 lățime de grid pe partea profitului; TP-ul tău e rândul de sus; neutru ⇒ nimic", () => {
  const st = { jos: 0.4, sus: 0.44, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.36 }, tp: 0.47, botulTau: true };
  const l = G.mcsTinteBot(st);
  assert.deepEqual(l.map((x) => x.tp === null ? null : +x.tp.toFixed(4)), [null, 0.44, 0.45, 0.46, 0.47, 0.48]);
  assert.equal(l.filter((x) => x.tu).length, 1); assert.equal(l.find((x) => x.tu).tp, 0.47);
  const sh = G.mcsTinteBot(Object.assign({}, st, { dir: "short", stop: { sus: 0.46 }, tp: null }));
  assert.deepEqual(sh.map((x) => x.tp === null ? null : +x.tp.toFixed(4)), [null, 0.4, 0.39, 0.38, 0.36]); assert.equal(sh[0].tu, true, "fără TP e al tău");
  assert.deepEqual(G.mcsTinteBot(Object.assign({}, st, { dir: "neutru" })), []);
});
await test("(2d) mcsCalcTinteBot: aceleași drumuri ca botul (sămânța 12), drum cu drum față de TP-ul tău; tabelul + „ce aș face eu”", () => {
  const b = bare15(20, 3, 0.012), st = { jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 }, tp: null, botulTau: true };
  const rows = G.mcsCalcTinteBot(b, st, 1, { n: 80 });
  assert.equal(rows.length, 5); assert.equal(rows[0].drum, null);
  rows.slice(1).forEach((x) => { assert.ok(x.drum); assert.ok(Math.abs(x.drum.maiBun + x.drum.maiRau + x.drum.egal - 1) < 1e-9); });
  const card = M.grid(b, Object.assign({ pret: 1 }, st), { zile: 7, n: 80, seed: 12, faraCuTendinta: true });
  assert.equal(rows[0].g.p50, card.p50, "rândul tău = cardul botului");
  const h = G.mcsTpHtml({ setari: st, tinteBot: rows });
  assert.match(h, /Altă țintă \(TP\), aceleași drumuri/); assert.match(h, /<th>TP atins<\/th>/); assert.match(h, /<th>Drum cu drum<\/th>/); assert.match(h, /Ce aș face eu:/);
  assert.match(h, /<tr class="mcsVarTu"><td>fără TP<span class="t212Mic">al tău<\/span>/);
  assert.match(G.mcsTpHtml({ setari: st }), /data-action-click="mcsComparaTp\(\)"/);
  assert.match(G.mcsTpHtml({ setari: Object.assign({}, st, { dir: "neutru" }) }), /La neutru/);
});
await test("(2e) recomandarea TP: alta doar cu mijlocul mai bun cu pragul (1 USDT / 2% din sumă), sigur drum cu drum, fără lichidare și fără coada de jos mai rea", () => {
  const g = (p50, p5) => ({ p50, p5, pPlus: 0.5, pLichidare: 0, pTp: 0.3, pStop: 0.1 });
  const d = (a, r) => ({ maiBun: a, maiRau: r, egal: 1 - a - r });
  const tu = { nume: "fără TP", tp: null, tu: true, g: g(-2, -9) };
  assert.match(G.mcsTpRecomandat([tu, { nume: "+¼ din grid", tp: 1.05, g: g(0, -8), drum: d(0.5, 0.1) }], 50), /^Aș pune TP-ul la 1,05: de obicei 0,0 USDT în loc de −2,0 USDT, mai bun în 50% din drumuri \(mai rău în 10%\)/);
  assert.match(G.mcsTpRecomandat([tu, { nume: "+¼ din grid", tp: 1.05, g: g(0, -8), drum: d(0.3, 0.3) }], 50), /^Rămâi fără TP/, "nesigur drum cu drum");
  assert.match(G.mcsTpRecomandat([tu, { nume: "+¼ din grid", tp: 1.05, g: g(-1.5, -8), drum: d(0.5, 0.1) }], 50), /^Rămâi fără TP/, "sub prag");
  assert.match(G.mcsTpRecomandat([tu, { nume: "+¼ din grid", tp: 1.05, g: g(0, -12), drum: d(0.5, 0.1) }], 50), /^Rămâi fără TP/, "coada mai rea");
});
await test("(2f) formularul are TP; „Refă” îl citește; aceleași setări cu alt TP ⇒ altele; variantele mută TP-ul cu marginea", () => {
  const st = G.mcsSetariBot([bot({})], "PONS");
  assert.match(G.mcsGridHtml({ tip: "coin", sim: "PONS", setari: st, grid: { eroare: "x" } }), /<input id="mcsTpBot" inputmode="decimal" placeholder="fără" value="0.47">/);
  assert.match(functie(MSE, "mcsResimuleaza"), /mcsNumar\("mcsTpBot"\)/); assert.match(functie(MSE, "mcsTasta"), /TpBot/);
  assert.equal(G.mcsAceleasiSetari(st, Object.assign({}, st, { tp: 0.5 })), false); assert.equal(G.mcsAceleasiSetari(st, Object.assign({}, st)), true);
  const v = G.mcsVariante(st), larg = v.find((x) => /mai larg/.test(x.nume)).st;
  assert.ok(Math.abs((larg.tp - larg.sus) - (st.tp - st.sus)) < 1e-12, "TP-ul păstrează distanța de marginea de sus");
});
await test("(2g) pe 15 grafice fără avantaj (15 minute), „Aș pune TP-ul” apare cel mult o dată", () => {
  let da = 0;
  for (let k = 0; k < 15; k++) {
    const b = bare15(20, 300 + k, 0.01), P = b[b.length - 1].c, st = { jos: P * 0.94, sus: P * 1.06, grile: 15, levier: 2, dir: "long", suma: 50, stop: { jos: P * 0.88 }, tp: null, botulTau: false };
    if (/^Aș pune/.test(G.mcsTpRecomandat(G.mcsCalcTinteBot(b, st, P, { n: 120 }), 50))) da++;
  }
  assert.ok(da <= 1, da + " din 15");
});

// ---------------- revizia v100.132 ----------------
await test("(R1) mcsTinteBot(st, P): nivelurile deja atinse la prețul de acum ies din listă (long ≤ P, short ≥ P)", () => {
  const st = { jos: 0.4, sus: 0.44, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.36 }, tp: null };
  assert.deepEqual(G.mcsTinteBot(st, 0.445).map((x) => x.tp === null ? null : +x.tp.toFixed(4)), [null, 0.45, 0.46, 0.48]);
  assert.deepEqual(G.mcsTinteBot(Object.assign({}, st, { dir: "short", stop: { sus: 0.46 } }), 0.395).map((x) => x.tp === null ? null : +x.tp.toFixed(4)), [null, 0.39, 0.38, 0.36]);
});
await test("(R2) un TP de partea greșită a prețului (long sub preț / short peste) nu intră în simulare: tpIgnorat + nota pe card", () => {
  const d = { tip: "coin", sim: "PONS", sursa: "x", b15: bare15(20, 3), b1: [], ist: { r: { cazuri: 0 } } }, P = d.b15[d.b15.length - 1].c;
  const r = G.mcsCalculeaza(d, { setari: { jos: P * 0.95, sus: P * 1.05, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: P * 1.1 }, tp: P * 1.2, botulTau: false } });
  assert.equal(r.setari.tp, null); assert.equal(r.setari.tpIgnorat, P * 1.2);
  assert.match(G.mcsGridHtml(r), /TP-ul \([\d,]+\) e de partea greșită a prețului pentru short: nu-l pun în simulare/);
  const r2 = G.mcsCalculeaza(d, { setari: { jos: P * 0.95, sus: P * 1.05, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: P * 1.2, botulTau: false } });
  assert.equal(r2.setari.tp, P * 1.2, "long cu TP deasupra: rămâne");
});
await test("(R3) stopurile după ATR fără dubluri după limitare (ATR 0,2% / 30%)", () => {
  const l = G.mcsListaStopuri(G.mcsStopuriAtr(0.002), 0.1); assert.deepEqual(l.map((x) => +x.toFixed(4)), [0.005, 0.006, 0.1]);
  const l2 = G.mcsListaStopuri(G.mcsStopuriAtr(0.3), 0.1); assert.deepEqual(l2.map((x) => +x.toFixed(4)), [0.1, 0.3, 0.45, 0.5]);
});
await test("(R4/R5) TP-ul din Pionex în procente ⇒ nota „aproximat”; la neutru câmpul TP e dezactivat", () => {
  const st = G.mcsSetariBot([bot({ opritorProfitTip: "raport", opritorProfitRaport: 0.2 })], "PONS");
  assert.equal(st.tpAprox, true);
  assert.match(G.mcsGridHtml({ tip: "coin", sim: "PONS", setari: st, grid: { eroare: "x" } }), /TP-ul tău e în procente din investiție/);
  assert.match(G.mcsGridHtml({ tip: "coin", sim: "PONS", setari: Object.assign({}, st, { dir: "neutru", tp: null }), grid: { eroare: "x" } }), /<input id="mcsTpBot" inputmode="decimal" placeholder="la neutru nu" value="" disabled>/);
});
await test("(R6) mcsCalcTinteBot refolosește cardul botului (o.prima) pentru rândul tău", () => {
  const b = bare15(20, 3, 0.012), st = { jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 }, tp: null };
  const card = M.grid(b, Object.assign({ pret: 1 }, st), { zile: 7, n: 80, seed: 12, peDrum: true });
  const rows = G.mcsCalcTinteBot(b, st, 1, { n: 80, prima: card });
  assert.equal(rows.find((x) => x.tu).g, card);
});
// pump & dump (urcare de 12% în 8 bare de 15 minute, apoi −20% în 24): mijlocul botului e același cu și fără TP, dar coada de jos
// se taie (măsurat la scriere: 5% sub −29,8 ⇒ +1,25 USDT) - regula pe mijloc n-o putea vedea
const pd = (zile, seed, pas, p) => { const g = M.generator(seed), b = []; let c = 1, faza = 0, k = 0;
  for (let i = 0; i < zile * 96; i++) { const o = c; let r = (g() - 0.5) * pas;
    if (faza === 0 && g() < p) { faza = 1; k = 0; }
    if (faza === 1) { r += Math.log(1.12) / 8; if (++k >= 8) { faza = 2; k = 0; } } else if (faza === 2) { r += Math.log(0.80) / 24; if (++k >= 24) faza = 0; }
    const x = c * Math.exp(r); b.push({ t: i * 9e5, o, h: Math.max(o, x) * 1.001, l: Math.min(o, x) * 0.999, c: x, v: 1 }); c = x; } return b; };
const tpLong = (b) => { const P = b[b.length - 1].c; return [{ jos: P * 0.95, sus: P * 1.05, grile: 15, levier: 2, dir: "long", suma: 50, stop: null, tp: null }, P]; };
await test("(R7a) putere: pe 10 grafice pump & dump, „Aș pune TP-ul … ca protecție” în cel puțin 5", () => {
  let da = 0, ex = "";
  for (let k = 0; k < 10; k++) { const b = pd(20, 1200 + k, 0.004, 0.01), [st, P] = tpLong(b), t = G.mcsTpRecomandat(G.mcsCalcTinteBot(b, st, P, { n: 120 }), 50); if (/^Aș pune TP-ul la [\d,]+ ca protecție/.test(t)) { da++; ex = ex || t; } }
  assert.ok(da >= 5, da + " din 10"); assert.match(ex, /taie coada de jos/);
});
await test("(R7b) alarme false: pe 30 de grafice fără avantaj (15 minute, long și short), „Aș pune / Aș scoate” cel mult o dată", () => {
  let da = 0;
  for (let k = 0; k < 30; k++) {
    const b = bare15(20, 400 + k, 0.01), P = b[b.length - 1].c, sh = k % 2 === 1;
    const st = sh ? { jos: P * 0.94, sus: P * 1.06, grile: 15, levier: 2, dir: "short", suma: 50, stop: { sus: P * 1.12 }, tp: null } : { jos: P * 0.94, sus: P * 1.06, grile: 15, levier: 2, dir: "long", suma: 50, stop: { jos: P * 0.88 }, tp: null };
    if (/^Aș (pune|scoate)/.test(G.mcsTpRecomandat(G.mcsCalcTinteBot(b, st, P, { n: 120 }), 50))) da++;
  }
  assert.ok(da <= 1, da + " din 30");
});
await test("(R8/R9) „Rămâi fără TP” / „Păstrează TP-ul la …”; textul spune de ce recomand rar alt TP", () => {
  const g = (p50, p5) => ({ p50, p5, p95: 5, pPlus: 0.5, pLichidare: 0, pTp: 0.3, pStop: 0.1 });
  const t = G.mcsTpRecomandat([{ nume: "fără TP", tp: null, tu: true, g: g(-2, -9) }, { nume: "+¼ din grid", tp: 1.05, g: g(-3, -9), drum: { maiBun: 0.2, maiRau: 0.5, egal: 0.3 } }], 50);
  assert.match(t, /^Rămâi fără TP/); assert.match(t, /de aceea recomand rar alt TP/);
});

// ---------------- (3) 🎲 din rând ----------------
await test("(3a) mcsRevineButon: butonul din rând deschide Monte Carlo pe poziție (mcsPozitie), cu clasa dată (ascunsă pe telefon)", () => {
  const h = G.mcsRevineButon("RHM.DE", 936.6, 1349.6, 1109.08, { p: 0.12, zile: 60 }, "t212RevMic");
  assert.equal(h, '<button type="button" class="mcsRevBtn t212Mic t212RevMic" data-action-click="mcsPozitie(\'RHM.DE\',936.6,1349.6,1109.08)" title="Monte Carlo pe poziție">🎲 revine la intrare: 12% în 60 z</button>');
  assert.equal(G.mcsRevineButon("<x>", 1, 2, 3, { p: 0.1, zile: 60 }, ""), "");
  assert.match(functie(TE, "t212RevineHtml"), /mcsRevineButon\(/); assert.match(citeste("public", "lib", "salt-ecran.js"), /mcsRevineButon\(p\.simbol, pr, a\.p\.pretMediu, n\.stopPozitie, a\.revine, "saltRevMic"\)/);
  assert.match(citeste("public", "app.css"), /\.mcsRevBtn\{/);
});

await test("(E) versiunea de la v100.132 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[2-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[2-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[2-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[2-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[2-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[2-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[2-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
