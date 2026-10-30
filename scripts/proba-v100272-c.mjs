// Proba v100.272-c (ideile auditului 29.10, felia 2 - Grid și statistica): constatările rămase, fiecare cu testul care pica pe codul de dinainte.
//  1. „Aș încerca X” / „Aș pune TP-ul la X” = cea mai bună din 6–7 variante pe ACELEAȘI drumuri ⇒ câștigătorul era favorizat de noroc. Acum
//     câștigătorul (și botul tău) se reiau pe 2.000 de drumuri NOI (altă sămânță) și sfatul rămâne doar dacă trece aceeași regulă și acolo;
//     textul spune cifrele de pe drumurile noi. Fără drumuri noi (Simulatorul): alegerea pe jumătate din drumuri, verificarea pe cealaltă.
//  2. o pagină de 15 minute lipsă după prima nu se spunea: verdictul ieșea pe 7–10 zile în tăcere ⇒ „doar N zile de istoric - o pagină n-a venit”.
//  3. „Aș porni” (2 condiții) vs „N-aș porni” (1): asimetria e intenționată - justificarea scrisă lângă cod, comportamentul neschimbat.
//  4. „Aș sări peste ea” număra pornirile la 6 h (ferestre de 3 zile suprapuse, 77 „din 109”) ⇒ acum pe ferestre fără suprapunere.
//  5. bani() fără zecimală peste 100 și „56 %” cu spațiu ⇒ o zecimală, procentul lipit („56,0%”).
//  6. jtPorneste secvențial ⇒ cererile spre serverul de acasă în paralel; grAduLumanari refolosește barele de 15 minute aduse deja pe moneda
//     aceea (o singură pagină nouă în loc de 6).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "monte-simbol.js", "grid-sim.js", "statistica-trade.js", "scor-sezon.js"])
  vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
const G = globalThis, M = G.MonteSimbol, ST = G.StatisticaTrade, SC = G.ScorSezon;
const APP = citeste("public", "app.js");
/* de la „function nume(” la început de rând până la următorul „\nfunction ” sau „\nasync function ” (un comentariu cu același text nu păcălește) */
const fnApp = (nume) => {
  const m = new RegExp("\\n(async )?function " + nume + "\\(").exec(APP); assert.ok(m, "lipsește " + nume + " în app.js");
  const rest = APP.slice(m.index + 10), j = rest.search(/\n(async )?function /);
  return APP.slice(m.index + 1, j < 0 ? undefined : m.index + 10 + j);
};
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); });
}
console.log("\nV100.272-c · AUDITUL 29.10 · felia 2 (Grid și statistica)\n");

// ───────────── (5) o zecimală, procentul lipit ─────────────
await test("5a bani(): o zecimală și peste 100 (1.234,6, nu 1.235); sub 100 la fel ca înainte", () => {
  assert.equal(ST.bani(1234.56, "USDT"), "+1.234,6 USDT");
  assert.equal(ST.bani(-150, "lei"), "−150,0 lei");
  assert.equal(ST.bani(99.94, "USDT"), "+99,9 USDT");
  assert.equal(ST.bani(null, "USDT"), "—");
});
await test("5b statistica: procentele cu O zecimală, lipite („56,3%”); pe card, totalul de peste 100 cu zecimala lui", () => {
  assert.equal(ST.procent(0.5633), "56,3%");
  assert.equal(ST.procent(0.5), "50,0%");
  const l = Array.from({ length: 12 }, (_, i) => ({ id: "b" + i, eticheta: "X", pornit: 1e12 + i * 864e5, inchis: 1e12 + i * 864e5 + 36e5, rezultat: i < 7 ? 20.5 : -2.21, baza: 100 }));
  const h = ST.html(ST.calc(l, { moneda: "USDT" }), { piata: "crypto" });
  assert.match(h, /\+132,4 USDT/, "netul 7 × 20,5 − 5 × 2,21 = 132,45 ⇒ +132,4 (prin bani ⇒ o zecimală)");
  assert.doesNotMatch(h, /\+132 USDT/);
  assert.match(h, /58,3%/, "rata 7 din 12");
});
await test("5c scorul sezonului: „56,3%”, nu „56 %”; progresul ratei la fel", () => {
  const START = Date.UTC(2026, 9, 18, 21, 0, 0), O = 3600000;
  const l = Array.from({ length: 12 }, (_, i) => ({ id: String(i), eticheta: "X", inchis: START + (i + 1) * O, rezultat: i % 12 < 7 ? 1 : -1 }));
  const s = SC.calc(l, { start: START, obiectiv: { rata: 0.55, serie: 3, net: 50, pana: null } }, START + 20 * O);
  const h = SC.html(s, { id: "x" });
  assert.doesNotMatch(h, /\d %/, "fără spațiu înainte de %: " + (h.match(/\d+ %/g) || []).join(" "));
  assert.match(h, /58,3%/, "rata 7 din 12");
  assert.match(h, /ținta 55,0%/);
  assert.match(h, /rata: 100,0% din țintă/);
  assert.match(SC.htmlIstoric([{ start: START - 9 * 864e5, sfarsit: START, curent: false, n: 3, win: 2, loss: 1, rata: 2 / 3, net: 1, seriePierderi: 1, moneda: "USDT" }, { start: START, sfarsit: null, curent: true, n: 12, win: 7, loss: 5, rata: 7 / 12, net: 2, seriePierderi: 1, moneda: "USDT" }]), /66,7%/);
});

// ───────────── (1) „Aș încerca X” / „Aș pune TP-ul la X”: câștigătorul verificat pe drumuri NOI ─────────────
const pcS = (v, p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
const statD = (x) => { const s = x.slice().sort((a, b) => a - b); return { p5: pcS(s, 0.05), p50: pcS(s, 0.5), p95: pcS(s, 0.95), pPlus: x.filter((v) => v > 0).length / x.length }; };
const gD = (x, o) => Object.assign(statD(x), { n: x.length, drumuri: x, pLichidare: 0 }, o || {});
await test("1a selecția e o funcție aparte (aceeași regulă ca până acum): mcsAlegeVarianta / mcsTreceVarianta, mcsAlegeTp", () => {
  for (const f of ["mcsAlegeVarianta", "mcsTreceVarianta", "mcsAlegeTp", "mcsVerificaPeDrumuriNoi", "mcsPeJumatate"]) assert.equal(typeof G[f], "function", "lipsește " + f);
  const g = (p50, p5, pPlus) => ({ p50, p5, pPlus, pLichidare: 0 }), baza = { nume: "așa cum e", st: { suma: 50 }, g: g(0, -5, 0.5) };
  const a = { nume: "A", st: {}, g: g(-2.0 + 4, -5, 0.5), drum: { maiBun: 0.6, maiRau: 0.4, egal: 0 } }, b = { nume: "B", st: {}, g: g(3, -5, 0.5), drum: { maiBun: 0.3, maiRau: 0.6, egal: 0.1 } };
  const r = G.mcsAlegeVarianta([baza, a, b]); assert.equal(r.c, a); assert.equal(r.prag, 1);
});
await test("1b câștigătorul care NU se ține pe drumurile noi ⇒ „Păstrează-l așa”, cu cifrele de pe drumurile noi (fără cele norocoase)", () => {
  const g = (p50, p5, pPlus) => ({ p50, p5, pPlus, pLichidare: 0 }), baza = { nume: "așa cum e", st: { suma: 50 }, g: g(0, -5, 0.5) };
  const c = { nume: "levier mai mic", st: {}, g: g(3, -5, 0.5), drum: { maiBun: 0.7, maiRau: 0.2, egal: 0.1 }, verif: { n: 2000, baza: g(0.4, -5, 0.5), g: g(0.9, -5, 0.5), drum: { maiBun: 0.48, maiRau: 0.45, egal: 0.07 } } };
  const t = G.mcsVariantaBuna([baza, c]);
  assert.match(t, /^Păstrează-l așa/); assert.match(t, /„levier mai mic”/); assert.match(t, /pe alte 2\.000 de drumuri nu s-a mai ținut/);
  assert.match(t, /\+0,9 USDT în loc de \+0,4 USDT/, "cifrele de pe drumurile noi"); assert.doesNotMatch(t, /\+3,0 USDT/, "nu cele norocoase");
});
await test("1c câștigătorul care se ține ⇒ „Aș încerca”, cu cifrele de pe drumurile noi și spus că a fost ales dintre N", () => {
  const g = (p50, p5, pPlus) => ({ p50, p5, pPlus, pLichidare: 0 }), baza = { nume: "așa cum e", st: { suma: 50 }, g: g(0, -5, 0.5) };
  const alta = { nume: "mai larg", st: {}, g: g(-1, -6, 0.45), drum: { maiBun: 0.3, maiRau: 0.6, egal: 0.1 } };
  const c = { nume: "levier mai mic", st: {}, g: g(3, -5, 0.5), drum: { maiBun: 0.7, maiRau: 0.2, egal: 0.1 }, verif: { n: 2000, baza: g(0.4, -5, 0.5), g: g(2.6, -4, 0.55), drum: { maiBun: 0.66, maiRau: 0.25, egal: 0.09 } } };
  const t = G.mcsVariantaBuna([baza, alta, c]);
  assert.match(t, /^Aș încerca „levier mai mic”: /);
  assert.match(t, /de obicei \+2,6 USDT în loc de \+0,4 USDT, pe plus în 55% din drumuri, mai bună decât a ta în 66% din drumuri \(mai rea în 25%\)/);
  assert.match(t, /cifrele de pe alte 2\.000 de drumuri, după ce am ales-o dintre 2 variante pe aceleași drumuri/);
});
await test("1d fără drumuri noi (Simulatorul): aleasă pe jumătate din drumuri, verificată pe cealaltă; fără niciun drum ⇒ nu recomand", () => {
  const n = 400, g = M.generator(4), base = Array.from({ length: n }, () => (g() - 0.5) * 10);
  /* „noroc” doar pe drumurile pare: pe ele varianta e cu 3 mai bună, pe cele impare la fel ca botul */
  const noroc = base.map((x, i) => (i % 2 === 0 ? x + 3 : x)), bun = base.map((x) => x + 2.5);
  const rd = (nume, x) => ({ nume, st: { suma: 50 }, g: gD(x), drum: nume === "așa cum e" ? undefined : G.mcsDrumCuDrum(base, x) });
  const t1 = G.mcsVariantaBuna([rd("așa cum e", base), rd("noroc", noroc)]);
  assert.match(t1, /^Păstrează-l așa/, t1); assert.match(t1, /pe cealaltă jumătate a drumurilor nu s-a mai ținut/);
  const t2 = G.mcsVariantaBuna([rd("așa cum e", base), rd("bun", bun)]);
  assert.match(t2, /^Aș încerca „bun”/, t2); assert.match(t2, /cifrele de pe cealaltă jumătate a drumurilor \(200\)/);
  const fara = (x) => Object.assign({}, x, { g: Object.assign({}, x.g, { drumuri: undefined }) });
  const t3 = G.mcsVariantaBuna([fara(rd("așa cum e", base)), fara(rd("bun", bun))]);
  assert.match(t3, /^Păstrează-l așa/, t3); assert.match(t3, /n-am pe ce s-o verific/);
});
await test("1e mcsCalcVariante: câștigătorul și botul reluați pe 2.000 de drumuri NOI (altă sămânță); textul spune cifrele de acolo", () => {
  /* neutru 4×, 120 de grile pe ±3%: „mai larg (×1,5)” iese aleasă pe aceleași drumuri (și se ține pe cele noi) */
  const b = bare15(31, 9, 0.01), P = b[b.length - 1].c;
  const st = { jos: P * 0.97, sus: P * 1.03, grile: 120, levier: 4, dir: "neutru", suma: 50, stop: null, tp: null, botulTau: false, fundingZi: 0.0003, fundingCost: true };
  const rows = G.mcsCalcVariante(b, st, P, { n: 300 }), a = G.mcsAlegeVarianta(rows);
  assert.ok(a.c, "pe seria asta regula alege o variantă pe aceleași drumuri");
  const cu = rows.filter((x) => x.verif);
  assert.equal(cu.length, 1); assert.equal(cu[0], a.c, "doar câștigătorul are verificarea");
  assert.equal(a.c.verif.n, 2000); assert.equal(a.c.verif.g.n, 2000); assert.equal(a.c.verif.baza.n, 2000);
  const gN = M.grid(b, Object.assign({ pret: P }, a.c.st), { zile: 7, n: 2000, seed: G.MCS_VERIF.seed, faraCuTendinta: true });
  const gB = M.grid(b, Object.assign({ pret: P }, rows[0].st), { zile: 7, n: 2000, seed: G.MCS_VERIF.seed, faraCuTendinta: true });
  assert.notEqual(G.MCS_VERIF.seed, 12); assert.equal(a.c.verif.g.p50, gN.p50); assert.equal(a.c.verif.baza.p50, gB.p50);
  const t = G.mcsVariantaBuna(rows);
  assert.match(t, /^Aș încerca „mai larg \(×1,5\)”/, t);
  assert.ok(t.indexOf("de obicei " + G.mcsBani1(gN.p50) + " în loc de " + G.mcsBani1(gB.p50)) >= 0, "cifrele de pe drumurile noi: " + t);
  assert.notEqual(G.mcsBani1(gN.p50), G.mcsBani1(a.c.g.p50), "cifrele noi diferă de cele ale alegerii (altfel testul n-ar deosebi)");
});
await test("1f mărimea sub H0 (variante cu același mijloc ca botul, bazin de 2.000 de drumuri, 150 de trageri): fără verificare ≥ 10%, cu ea ≤ 5%", () => {
  const b = bare15(31, 9, 0.01), P = b[b.length - 1].c, NB = 2000, R = 150, rnd = M.generator(5);
  const st = { jos: P * 0.97, sus: P * 1.03, grile: 15, levier: 5, dir: "long", suma: 50, stop: { jos: P * 0.95 }, tp: null, botulTau: false, fundingZi: 0.0003, fundingCost: true };
  const vs = G.mcsVariante(st), gs = vs.map((v) => M.grid(b, Object.assign({ pret: P }, v.st), { zile: 7, n: NB, seed: 12, faraCuTendinta: true, peDrum: true }));
  const m0 = statD(gs[0].drumuri).p50, pool = gs.map((g, k) => (k ? g.drumuri.map((x) => x - (statD(g.drumuri).p50 - m0)) : g.drumuri));
  const rows = (idx) => { const sub = pool.map((v) => idx.map((i) => v[i])); return sub.map((x, k) => ({ nume: vs[k].nume, st: vs[k].st, g: gD(x, { pLichidare: gs[k].pLichidare }), drum: k ? G.mcsDrumCuDrum(sub[0], x) : undefined })); };
  let u = 0, h = 0;
  for (let q = 0; q < R; q++) {
    const A = Array.from({ length: 500 }, () => Math.floor(rnd() * NB)), B = Array.from({ length: 2000 }, () => Math.floor(rnd() * NB));
    const ra = rows(A), a = G.mcsAlegeVarianta(ra);
    if (a.c) { u++; const rb = rows(B), k = ra.indexOf(a.c); a.c.verif = { n: 2000, baza: rb[0].g, g: rb[k].g, drum: rb[k].drum }; }
    if (/^Aș încerca/.test(G.mcsVariantaBuna(ra))) h++;
  }
  assert.ok(u / R >= 0.1, "fără verificare: " + u + " din " + R + " (problema se vede)");
  assert.ok(h / R <= 0.05, "cu verificarea pe drumuri noi: " + h + " din " + R);
});
await test("1g TP: alesul se verifică pe drumuri noi; nu se ține ⇒ rămâi; se ține ⇒ „Aș pune TP-ul”, cu cifrele noi", () => {
  const g = (p50, p5, o) => Object.assign({ p50, p5, p95: 5, pPlus: 0.5, pLichidare: 0, pTp: 0.3, pStop: 0.1 }, o || {});
  const tu = { nume: "fără TP", tp: null, tu: true, g: g(-2, -9) };
  const x = (verif) => ({ nume: "+¼ din grid", tp: 1.05, g: g(0.5, -8), drum: { maiBun: 0.8, maiRau: 0.1, egal: 0.1 }, verif });
  const nu = G.mcsTpRecomandat([tu, x({ n: 2000, baza: g(-1.5, -9), g: g(-1.2, -9), drum: { maiBun: 0.5, maiRau: 0.4, egal: 0.1 } })], 50);
  assert.match(nu, /^Rămâi fără TP/, nu); assert.match(nu, /pe alte 2\.000 de drumuri nu s-a mai ținut/);
  const da = G.mcsTpRecomandat([tu, x({ n: 2000, baza: g(-1.5, -9), g: g(0.2, -8), drum: { maiBun: 0.78, maiRau: 0.12, egal: 0.1 } })], 50);
  assert.match(da, /^Aș pune TP-ul la 1,05: de obicei \+0,2 USDT în loc de −1,5 USDT, mai bun în 78% din drumuri \(mai rău în 12%\)/, da);
  assert.match(da, /cifrele de pe alte 2\.000 de drumuri/);
  /* pump & dump (ca proba v100.132 R7a): „ca protecție” e ales pe aceleași drumuri și se ține pe cele noi */
  const pd = (zile, seed, pas, p) => { const r0 = M.generator(seed), b = []; let c = 1, faza = 0, k = 0;
    for (let i = 0; i < zile * 96; i++) { const o = c; let r = (r0() - 0.5) * pas;
      if (faza === 0 && r0() < p) { faza = 1; k = 0; }
      if (faza === 1) { r += Math.log(1.12) / 8; if (++k >= 8) { faza = 2; k = 0; } } else if (faza === 2) { r += Math.log(0.80) / 24; if (++k >= 24) faza = 0; }
      const x = c * Math.exp(r); b.push({ t: i * 9e5, o, h: Math.max(o, x) * 1.001, l: Math.min(o, x) * 0.999, c: x, v: 1 }); c = x; } return b; };
  const b = pd(20, 1200, 0.004, 0.01), P = b[b.length - 1].c, st = { jos: P * 0.95, sus: P * 1.05, grile: 15, levier: 2, dir: "long", suma: 50, stop: null, tp: null };
  const rows = G.mcsCalcTinteBot(b, st, P, { n: 120 }), at = G.mcsAlegeTp(rows, 50), ales = at.ok || at.prot;
  assert.ok(at.prot, "pe pump & dump alege un TP „ca protecție”");
  rows.forEach((r) => assert.equal(!!r.verif, r === ales, "verificarea doar pe TP-ul ales"));
  assert.equal(ales.verif.n, 2000);
  const t = G.mcsTpRecomandat(rows, 50);
  assert.match(t, /^Aș pune TP-ul la [\d,]+ ca protecție: de obicei cam la fel/, t);
  assert.ok(t.indexOf("cele mai proaste " + G.mcsBani1(ales.verif.g.p5) + " în loc de " + G.mcsBani1(ales.verif.baza.p5)) >= 0, "coada de jos de pe drumurile noi: " + t);
  assert.match(t, /Cifrele de pe alte 2\.000 de drumuri, după ce l-am ales dintre \d+ ținte pe aceleași drumuri\./);
});

// ───────────── (3) asimetria „Aș porni” / „N-aș porni”: voită, justificată lângă cod, comportament neschimbat ─────────────
await test("3 „Aș porni” cere marja ȘI istoria reală pe plus; „N-aș porni” doar marja (reluarea corectează o abatere într-o parte) - justificarea stă lângă cod", () => {
  const GS = G.GridSim, OR = (pC, marja, media) => ({ zile: 7, pCastig: pC, pPierde: 1 - pC, pZero: 0, p50: pC > 0.5 ? 1.2 : -1.4, p5: -6, p95: 4, marja, zileDistincte: 20, pLich: 0, pStop: 0, plan: null, reluare: { media, pPlus: 0.5, n: 40, independente: 6 } });
  assert.match(GS.verdict({ orizonturi: [OR(0.70, 10, 0.8)] }, {}, null, 0, null).faCe, /^Aș porni/);
  assert.match(GS.verdict({ orizonturi: [OR(0.70, 10, -0.5)] }, {}, null, 0, null).faCe, /^O aruncare de ban/, "istoria reală pe minus ⇒ nu „Aș porni”");
  const v = GS.verdict({ orizonturi: [OR(0.30, 10, 0.8)] }, {}, null, 0, null);
  assert.match(v.faCe, /^N-aș porni/, "istoria reală pe plus NU oprește „N-aș porni” (tendința perioadei nu se prelungește)"); assert.equal(v.rauConfirmat, true);
  const src = citeste("public", "lib", "grid-sim.js"), i = src.indexOf("var rauConfirmat");
  assert.match(src.slice(Math.max(0, i - 1200), i), /v100\.272[^]*asimetria rămasă e VOITĂ[^]*ÎNTR-O SINGURĂ PARTE[^]*103 din 108/);
});

// ───────────── (4) „Aș sări peste ea” pe ferestre fără suprapunere ─────────────
const GP = G.GridPlan, GC = G.GridCalcul;
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
await test("4a GridPlan.proba: pe lângă pornirile la 6 h, ferestrele de 3 zile FĂRĂ suprapunere (10 pe 30 de zile), recontate una câte una", () => {
  const b = bare15(34, 77, 0.012), P = b[b.length - 1].c;
  const st = { dir: "long", pret: P, jos: P * 0.97, sus: P * 1.02, grile: 12, levier: 3, suma: 50, stop: { jos: P * 0.97 * 0.995, sus: P * 1.02 * 1.005 } };
  const p = GP.proba(b, st, 30, 0);
  assert.ok(p && p.n > 100, "pornirile la 6 h rămân: " + (p && p.n));
  const f = p.faraSuprapunere; assert.ok(f, "lipsește proba.faraSuprapunere");
  const W = 3 * 96, n0 = b.length - 30 * 96; let n = 0, s = 0;
  for (let i = n0; i + W <= b.length; i += W) {
    const k = b[i].o / P, r = G.GridProba.simuleaza(b, i, W, { dir: "long", jos: st.jos * k, sus: st.sus * k, grile: st.grile, levier: st.levier, stop: { jos: st.stop.jos * k, sus: st.stop.sus * k }, fundingZi: p.funding.rataZi, fundingCost: p.funding.presupus });
    n++; if (!r.lichidat && r.iesit === "jos") s++;
  }
  assert.deepEqual({ n: f.n, stop: f.stop }, { n, stop: s });
  assert.equal(f.n, 10); assert.ok(f.stop > 0 && f.stop < p.stop, "stopul în câteva ferestre (aici 4), nu în toate pornirile (39)");
});
const PR = (stop, n, fs, o) => Object.assign({ stop, n, tinta: n - stop - 2, inGrid: 2, zile: 30, ferestreZile: 3, oreTipic: 3.75, mediaUsdt: -1.6, ceaMaiProastaUsdt: -4.4, independente: 10 }, fs ? { faraSuprapunere: fs } : {}, o || {});
await test("4b deSarit judecă pe ferestrele fără suprapunere: 77 din 109 porniri dar 4 din 10 ferestre ⇒ nu sar; 40 din 109 dar 6 din 10 ⇒ sar", () => {
  assert.equal(GP.deSarit({ proba: PR(77, 109, { n: 10, stop: 4 }) }), null, "4 din 10 ferestre independente nu e peste jumătate");
  const d = GP.deSarit({ proba: PR(40, 109, { n: 10, stop: 6 }) });
  assert.ok(d, "6 din 10 ferestre ⇒ aș sări");
  assert.equal(d.text, "aș sări peste ea: stopul a venit în 6 din 10 ferestre de 3 zile fără suprapunere (60,0%; 40 din 109 porniri la 6 h)");
  assert.equal(GP.deSarit({ proba: PR(80, 109, { n: 4, stop: 4 }) }), null, "sub 5 ferestre independente: prea puține ca să judec");
  assert.equal(GP.deSarit({ proba: PR(77, 109) }).text, "aș sări peste ea: stopul a venit în 77 din 109 porniri (71%)", "date salvate înainte (fără ferestre): regula veche");
});
await test("4c alegerea între ÎNGUST și LARG spune ambele pe aceeași bază (ferestre fără suprapunere), iar „aș aștepta” spune de ce, pe ferestre", () => {
  const v = GP.variante({ pret: 0.1003, dir: "long", suma: 43.87, levier: 5, levierSigur: 3, plan: { plus: 2.2, minus: 4.4 }, amp: 0.112, pas: 0.003 });
  v.ta.proba = PR(77, 109, { n: 10, stop: 7 }); v.mea.proba = PR(54, 109, { n: 10, stop: 4 }, { mediaUsdt: -3.0 });
  const r = GP.alege(v.ta, v.mea);
  assert.equal(r.cine, "mea");
  assert.match(r.text, /^LARG · la ÎNGUST stopul a venit în 7 din 10 ferestre fără suprapunere \(70,0%\), aici în 4 din 10 ferestre; la stop pierzi /);
  v.mea.proba = PR(70, 109, { n: 10, stop: 6 });
  const a = GP.alege(v.ta, v.mea); assert.equal(a.asteapta, true);
  assert.equal(a.deCe, "amândouă au stopul în peste jumătate din ferestrele de 3 zile fără suprapunere");
  assert.match(fnApp("gridCopiaza"), /stopul vine în peste jumătate din ferestrele probei/, "avertismentul la copiere, pe aceeași bază");
});

// ───────────── (6) + (2) aducerea lumânărilor: o memorie pe monedă, două fire, pagina lipsă spusă ─────────────
const Q = 900000;
/* Pionex de probă: 15M pe pagini de 500 (endTime), celelalte intervale câteva rânduri, funding; o = { picaPagina: k (a k-a cerere 15M e refuzul moale),
   picaPrima: true, vechime: ms în urmă pentru ultima bară } - ține jurnalul cererilor și câte au fost în zbor deodată */
function pionexProba(o = {}) {
  const log = [], zbor = { n: 0, max: 0 }; let n15 = 0;
  const rand = (t) => ({ time: t, open: "1.00", high: "1.01", low: "0.99", close: "1.00", volume: "5" });
  const getJSON = async (url) => {
    log.push(url); zbor.n++; zbor.max = Math.max(zbor.max, zbor.n);
    try {
      await new Promise((r) => setTimeout(r, 3));
      const u = new URL(url, "http://x"), iv = u.searchParams.get("interval"), end = Number(u.searchParams.get("endTime")) || null;
      if (u.searchParams.get("type") === "pionex_funding") return { data: { rates: [{ fundingTime: Date.now() - 8 * 36e5, fundingRate: "0.0001" }, { fundingTime: Date.now() - 16 * 36e5, fundingRate: "0.0001" }] } };
      if (iv === "15M") {
        n15++;
        if ((o.picaPrima && n15 === 1) || o.picaPagina === n15) return { result: false, error: "Pionex klines unavailable" };
        const ult = Math.floor((end ? end : Date.now()) / Q) * Q, ka = [], cate = !end && o.scurt ? o.scurt : 500;
        for (let i = cate - 1; i >= 0; i--) ka.push(rand(ult - i * Q));
        return { data: { klines: ka } };
      }
      return { data: { klines: [rand(Date.now() - 4 * 36e5), rand(Date.now())] } };
    } finally { zbor.n--; }
  };
  return { log, zbor, getJSON, n15: () => log.filter((x) => /interval=15M/.test(x)).length };
}
const GR_FN = ["grRanduri", "grTimp15", "grBareTbMc", "grBare15Tinute", "grTine15", "grAdu15", "grAduRest", "grAduLumanari"];
function ctxGrid(px, extra) {
  const box = Object.assign({ getJSON: px.getJSON, grPauza: () => Promise.resolve(), GridCalcul: GC, GridSim: G.GridSim, grLum15: {}, console }, extra || {});
  vm.createContext(box); vm.runInContext(GR_FN.map(fnApp).join("\n"), box, { filename: "app-gr.js" }); return box;
}
const bareRecente = (n, vechime) => { const ult = Math.floor((Date.now() - (vechime || 0)) / Q) * Q - Q; return Array.from({ length: n }, (_, i) => ({ t: ult - (n - 1 - i) * Q, o: 1, h: 1.01, l: 0.99, c: 1, v: 5 })); };
await test("6a fișa fără nimic ținut minte: aceleași 11 cereri ca înainte (6 pagini de 15 min + 4 h, 1 zi, 5 min, 1 h, funding), dar pe două fire (cel mult 2 deodată)", async () => {
  const px = pionexProba(), c = ctxGrid(px), d = await c.grAduLumanari("BTC_USDT_PERP");
  assert.equal(px.log.length, 11, px.log.join("\n")); assert.equal(px.n15(), 6);
  assert.equal(px.zbor.max, 2, "două fire în paralel, nu mai multe");
  const i4 = px.log.findIndex((x) => /interval=4H/.test(x)), i15 = px.log.map((x, i) => (/interval=15M/.test(x) ? i : -1)).filter((i) => i >= 0);
  assert.ok(i4 > i15[0] && i4 < i15[5], "firul 2 pleacă după prima pagină reușită, înainte de ultima");
  assert.equal(GC.bare(d.r15).length, 2999); assert.equal(d.r4.length, 2); assert.ok(d.fundingZi !== null);
  assert.equal(d.istoric15.motiv, null); assert.ok(d.istoric15.zile > 31);
});
await test("6b a doua oară pe aceeași monedă: o singură pagină de 15 min, lipită de barele ținute minte (6 cereri în loc de 11)", async () => {
  const px = pionexProba(), c = ctxGrid(px);
  await c.grAduLumanari("BTC_USDT_PERP"); const n1 = px.log.length;
  const d = await c.grAduLumanari("BTC_USDT_PERP");
  assert.equal(px.log.length - n1, 6); assert.equal(px.log.slice(n1).filter((x) => /interval=15M/.test(x)).length, 1);
  assert.ok(!/endTime/.test(px.log.slice(n1).find((x) => /interval=15M/.test(x))), "pagina cea nouă, fără endTime");
  assert.equal(GC.bare(d.r15).length, 2999, "aceleași ultime 2.999 de bare închise"); assert.equal(d.istoric15.motiv, null);
});
await test("6c barele aduse întregi de Monte Carlo pe bot (mcsAduCoin, tbMc) pe aceeași monedă ⇒ refolosite: o pagină de 15 min", async () => {
  const px = pionexProba(), c = ctxGrid(px, { tbMc: { b15Sim: "BTC", b15Intreg: true, b15: bareRecente(2999, 0), b15La: Date.now() } });
  const d = await c.grAduLumanari("BTC_USDT_PERP");
  assert.equal(px.n15(), 1); assert.equal(GC.bare(d.r15).length, 2999);
  const px2 = pionexProba(), c2 = ctxGrid(px2, { tbMc: { b15Sim: "ETH", b15Intreg: true, b15: bareRecente(2999, 0) } });
  await c2.grAduLumanari("BTC_USDT_PERP"); assert.equal(px2.n15(), 6, "altă monedă ⇒ nu");
  const px3 = pionexProba(), c3 = ctxGrid(px3, { tbMc: { b15Sim: "BTC", b15Intreg: false, b15: bareRecente(1000, 0) } });
  await c3.grAduLumanari("BTC_USDT_PERP"); assert.equal(px3.n15(), 6, "tăiate de o eroare ⇒ nu");
});
await test("6d memoria prea veche (ultima bară acum 6 zile) ⇒ toate cele 6 pagini, ca înainte", async () => {
  const px = pionexProba(), c = ctxGrid(px, { tbMc: { b15Sim: "BTC", b15Intreg: true, b15: bareRecente(2999, 6 * 864e5) } });
  await c.grAduLumanari("BTC_USDT_PERP"); assert.equal(px.n15(), 6);
  /* gaură: memoria de acum 3 zile, dar pagina nouă acoperă doar o zi (nu se leagă) ⇒ nu lipesc peste gol, aduc toate paginile */
  const px2 = pionexProba({ scurt: 96 }), c2 = ctxGrid(px2, { tbMc: { b15Sim: "BTC", b15Intreg: true, b15: bareRecente(2999, 3 * 864e5) } });
  const d2 = await c2.grAduLumanari("BTC_USDT_PERP"); assert.equal(px2.n15(), 1 + 1, "pagina nouă, apoi aducerea întreagă (care se oprește la pagina scurtă)");
  const t = GC.bare(d2.r15).map((b) => b.t); assert.ok(t.every((x, i) => !i || x - t[i - 1] === Q), "fără gol în bare");
});
await test("6e prima pagină refuzată ⇒ eroarea și NICIO altă cerere (cu firul 2 pornit de la început ar fi plecat încă 5)", async () => {
  const px = pionexProba({ picaPrima: true }), c = ctxGrid(px);
  await assert.rejects(c.grAduLumanari("BTC_USDT_PERP"), /Pionex klines unavailable/);
  await new Promise((r) => setTimeout(r, 30)); assert.equal(px.log.length, 1, px.log.join("\n"));
});
await test("2a o pagină de 15 min picată după prima ⇒ verdictul pe ~10 zile, dar spus: istoric15 = { zile, motiv: „pagina” } și textul de pe ecran", async () => {
  const px = pionexProba({ picaPagina: 3 }), c = ctxGrid(px), d = await c.grAduLumanari("BTC_USDT_PERP");
  assert.equal(px.n15(), 3); assert.equal(d.istoric15.motiv, "pagina"); assert.ok(Math.abs(d.istoric15.zile - 999 / 96) < 1e-9, String(d.istoric15.zile));
  assert.equal(G.mcsIstoricScurt(d.istoric15, "ce se socotește pe 15 minute e pe atât"), "Doar 10 zile de istoric pe 15 minute - o pagină n-a venit de la Pionex (de obicei ~31 de zile): ce se socotește pe 15 minute e pe atât.");
  assert.equal(G.mcsIstoricScurt({ zile: 9.4, motiv: "nou" }, "x"), "Doar 9 zile de istoric pe 15 minute - atât are Pionex pentru moneda asta (de obicei ~31 de zile): x.");
  assert.equal(G.mcsIstoricScurt({ zile: 31.2, motiv: null }, "x"), ""); assert.equal(G.mcsIstoricScurt(null, "x"), "");
  const px2 = pionexProba({ picaPagina: 3 }), c3 = ctxGrid(px2);
  await c3.grAduLumanari("BTC_USDT_PERP"); assert.equal(c3.grLum15.BTC_USDT_PERP.intreg, false, "tăiate ⇒ nu se lipesc data viitoare");
  await c3.grAduLumanari("BTC_USDT_PERP"); assert.equal(px2.n15(), 3 + 6, "data viitoare: toate paginile din nou");
});
await test("2b fișa Grid arată nota de istoric scurt sub verdict; pagina Monte Carlo pe coin la fel, iar nota de jos nu mai zice „atât dă Pionex” când a lipsit o pagină", () => {
  assert.match(fnApp("renderGrid"), /mcsIstoricScurt\(dG&&dG\.istoric15,/);
  const b = bare15(10, 4, 0.01), d = { tip: "coin", sim: "PONS", sursa: "x", b15: b, b1: [], ist: { r: { cazuri: 0 } }, istoric15: { zile: b.length / 96, motiv: "pagina" } };
  const r = G.mcsCalculeaza(d, {}); assert.deepEqual(r.istoric15, d.istoric15);
  const h = G.mcsGridHtml(r);
  assert.match(h, /Doar 10 zile de istoric pe 15 minute - o pagină n-a venit de la Pionex \(de obicei ~31 de zile\): simularea botului e pe atât\./);
  assert.doesNotMatch(h, /atât dă Pionex/);
  const h2 = G.mcsGridHtml(G.mcsCalculeaza(Object.assign({}, d, { istoric15: { zile: 31.2, motiv: null } }), {}));
  assert.doesNotMatch(h2, /Doar \d+ zile de istoric/); assert.match(h2, /atât dă Pionex/);
});
await test("2c pagina Monte Carlo pe coin: aducerea refolosește barele ținute minte de fișă (o pagină) și le lasă fișei pe cele întregi", async () => {
  const chem = [], tinute = {};
  const vechi = { mcsAduCoin: G.mcsAduCoin, getJSON: G.getJSON, grBare15Tinute: G.grBare15Tinute, grTine15: G.grTine15 };
  try {
    G.grBare15Tinute = (s) => (s === "PONS_USDT_PERP" ? bareRecente(2999, 0) : null);
    G.grTine15 = (s, b) => { tinute[s] = b; };
    G.mcsAduCoin = async (sim, o) => { chem.push([sim, o]); return { b15: bare15(31, 4, 0.01), b1: [], fundingInfo: null, intreg: true }; };
    G.getJSON = async () => ({ boti: [] });
    G.mcsStare.inLucru = false; G.mcsStare.sim = "PONS"; G.mcsStare.forta = "coin"; G.mcsStare.arhiva = [];
    await G.mcsAnalizeaza();
    assert.equal(chem.length, 1); assert.equal(chem[0][1] && chem[0][1].vechi && chem[0][1].vechi.length, 2999, "vechi = barele fișei");
    assert.ok(tinute.PONS_USDT_PERP && tinute.PONS_USDT_PERP.length > 2900, "barele întregi lăsate fișei");
    assert.equal(G.mcsStare.date.istoric15.motiv, null);
    G.mcsAduCoin = async () => ({ b15: bare15(9, 4, 0.01), b1: [], fundingInfo: null, intreg: false });
    G.mcsStare.forta = "coin"; await G.mcsAnalizeaza();
    assert.equal(G.mcsStare.date.istoric15.motiv, "pagina"); assert.match(G.mcsGridHtml(G.mcsStare.rez), /Doar 9 zile de istoric pe 15 minute - o pagină n-a venit/);
  } finally { Object.assign(G, vechi); }
});
await test("6f grBare15Tinute / grTine15: memoria fișei citită ca bare închise (doar întreagă și cu ultima bară de cel mult ~5 zile) și scrisă din bare", async () => {
  const c = ctxGrid(pionexProba());
  assert.equal(c.grBare15Tinute("BTC_USDT_PERP"), null);
  c.grTine15("BTC_USDT_PERP", bareRecente(2999, 0));
  const b = c.grBare15Tinute("BTC_USDT_PERP"); assert.equal(b.length, 2999, "închise, aceleași"); assert.equal(b[2998].t, bareRecente(2999, 0)[2998].t);
  c.grLum15.BTC_USDT_PERP.intreg = false; assert.equal(c.grBare15Tinute("BTC_USDT_PERP"), null);
  c.grTine15("ETH_USDT_PERP", bareRecente(2999, 6 * 864e5)); assert.equal(c.grBare15Tinute("ETH_USDT_PERP"), null, "prea vechi");
  /* memoria scrisă de fișă (lumânările Pionex, cu bara în formare) ⇒ doar cele închise */
  await c.grAduLumanari("SOL_USDT_PERP"); const s = c.grBare15Tinute("SOL_USDT_PERP");
  assert.equal(s.length, 2999); assert.ok(s[s.length - 1].t + Q <= Date.now(), "fără bara în formare");
});
await test("6g jtPorneste: boții Pionex, arhiva, contrafactualul, raportul și săptămâna pieței pleacă deodată (serverul de acasă, nu Pionex); erorile ca înainte", async () => {
  const pornite = [], asteapta = {}; let gataBoti = null;
  const getJSON = (url) => { pornite.push(url); return new Promise((res, rej) => {
    if (/bot-orders/.test(url)) { gataBoti = () => res({ bots: [{ strategyId: "1", buOrderType: "futures_grid" }] }); return; }
    if (/raportPiata/.test(url)) return setTimeout(() => rej(new Error("x")), 1);
    if (/action=raport/.test(url)) return setTimeout(() => rej(new Error("x")), 1);
    if (/contrafactual/.test(url)) return setTimeout(() => res({ contrafactual: { a: 1 } }), 1);
    if (/botiInchisi/.test(url)) return setTimeout(() => res({ boti: [{ strategyId: "2" }], la: "L", complet: true }), 1);
    rej(new Error("neașteptat " + url)); }); };
  const box = { getJSON, $: () => null, jtStare: { boti: null, la: 0, inLucru: false, eroare: null }, jtArhiva: { la: null, boti: null, complet: false, sursa: null }, jtRender: () => { asteapta.render = true; }, grTextEroare: (e) => String(e && e.message), console };
  vm.createContext(box); vm.runInContext(["jtAduBoti", "jtPorneste"].map(fnApp).join("\n"), box);
  const p = box.jtPorneste(true);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(pornite.length, 5, "toate cinci în zbor cât boții Pionex încă nu au venit: " + pornite.join(" | "));
  gataBoti(); await p;
  assert.deepEqual(box.jtStare.boti.map((b) => b.strategyId), ["1", "2"]); assert.deepEqual(box.jtStare.cf, { a: 1 });
  assert.equal(box.jtStare.raport, undefined, "raportul picat rămâne undefined (pagina spune „nu pot citi”)"); assert.equal(box.jtStare.raportPiata, null);
  assert.equal(box.jtArhiva.sursa, "acasa"); assert.equal(box.jtStare.eroare, null); assert.ok(asteapta.render);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
