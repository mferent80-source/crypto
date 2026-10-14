// Probele v100.196 - zona „boții și gridul” din auditul sever de seară (AUDIT-SEVER-CLAUDE-2026-10-14.md, raport_boti.md):
//  🔴1 stopul „la zero-ul botului” / „podeaua țintei” cu grilele cumpărate (la short: vândute) pe drum
//  🔴  grafic-bot: „lichidarea în 7 zile 0 %” ⇒ „< 1 %” + marginea de sus a intervalului
//  🟡 B1 simulatorul: incertitudinea pe zile (nu ±4 din 500 de drumuri), „Aș porni” cu reluarea istoricului real
//  🟡 B2 lichidarea > 0 pe drumuri ⇒ „N-aș porni”; fără „renunță la stop”
//  🟡 B3 stopul dincolo de lichidare ⇒ roșu, pierderea plafonată la marjă
//  🟡 B4 funding-ul în fișă, în proba ÎNGUST / LARG și în gridul îngust
//  🟡 B5 fișa: câte combinații s-au încercat, câte ferestre independente de test; sub 10 ⇒ nu PORNEȘTE
//  🔵 1–8
// Rulare: node scripts/proba-v100196-boti.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const LIB = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "monte-simbol.js", "grid-sim.js", "grafic-bot.js"]) vm.runInThisContext(LIB(f), { filename: f });
const { GridCalcul: G, GridProba: GP, GridPlan: GPl, TabloExtra: TE, SemnaleBot: S, Alerte: A, MonteSimbol: M, GridSim: GS, GraficBot: GB } = globalThis;

let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } }
console.log("\nv100.196 · boții și gridul · proba\n");

// ---------------------------------------------------------------- botul construit al auditului (podea.mjs) ----------------------------------------------------------------
// long 5×, 100 USDT, grid 0,9–1,1 geometric, 21 de linii (20 de intervale), pornit la 1,00, acum la 1,08 (urcat drept: celulele de sub 1,08 vândute)
const COM = 0.0005, COMG = 0.0002;
function botConstruit(o) {
  o = Object.assign({ dir: "long", suma: 100, L: 5, N: 20, jos: 0.9, sus: 1.1, P0: 1.0, P1: 1.08 }, o || {});
  const niv = G.niveluri(o.jos, o.sus, o.N), lung = o.dir === "long";
  const cel = []; for (let k = 0; k < o.N; k++) cel.push({ k, q: o.suma * o.L / o.N / niv[k], tine: false, intr: null });
  let fee = 0, real = 0;
  for (const c of cel) if (lung ? niv[c.k + 1] > o.P0 : niv[c.k] < o.P0) { c.tine = true; c.intr = o.P0; fee += c.q * o.P0 * COM; }
  // drumul P0 -> P1 drept: long vinde celulele cu vârful între P0 și P1 dacă urcă, cumpără celulele de sub P0 dacă scade (short oglindit)
  if (o.P1 > o.P0) for (const c of cel) {
    if (lung && c.tine && niv[c.k + 1] <= o.P1) { c.tine = false; real += c.q * (niv[c.k + 1] - c.intr); fee += c.q * niv[c.k + 1] * COMG; }
    if (!lung && !c.tine && niv[c.k + 1] <= o.P1 && niv[c.k + 1] > o.P0) { c.tine = true; c.intr = niv[c.k + 1]; fee += c.q * niv[c.k + 1] * COMG; }
  } else for (const c of cel) {
    if (lung && !c.tine && niv[c.k] >= o.P1 && niv[c.k] < o.P0) { c.tine = true; c.intr = niv[c.k]; fee += c.q * niv[c.k] * COMG; }
    if (!lung && c.tine && niv[c.k] >= o.P1) { c.tine = false; real += c.q * (c.intr - niv[c.k]); fee += c.q * niv[c.k] * COMG; }
  }
  const tin = cel.filter((c) => c.tine), q = tin.reduce((s, c) => s + c.q, 0), pd = q > 0 ? tin.reduce((s, c) => s + c.q * c.intr, 0) / q : 0, net = real - fee;
  const b = { directie: o.dir, investit: o.suma, levier: o.L, pozitie: lung ? q : -q, pretDeschidere: pd, pretCurent: o.P1, profitNet: net, profitTotal: net + (lung ? q * (o.P1 - pd) : q * (pd - o.P1)), gridJos: o.jos, gridSus: o.sus,
    distantaLichidarePct: 40, brut: { buOrderData: { row: o.N + 1, perVolume: o.suma * o.L / o.N / o.P0, gridType: "geometric" } } };
  // proba INDEPENDENTĂ, celulă cu celulă: pe drumul P1 -> X botul umple celulele de pe partea pierderii, apoi se închide tot la X (taker)
  b.independent = function (X) {
    let f2 = fee, r2 = real; const cs = cel.map((c) => ({ ...c }));
    for (const c of cs) {
      if (lung && X < o.P1 && !c.tine && niv[c.k] < o.P1 && niv[c.k] >= X) { c.tine = true; c.intr = niv[c.k]; f2 += c.q * niv[c.k] * COMG; }
      if (!lung && X > o.P1 && !c.tine && niv[c.k + 1] > o.P1 && niv[c.k + 1] <= X) { c.tine = true; c.intr = niv[c.k + 1]; f2 += c.q * niv[c.k + 1] * COMG; }
    }
    let Q = 0, Cc = 0; for (const c of cs) if (c.tine) { Q += c.q; Cc += c.q * c.intr; }
    return r2 - f2 + (lung ? Q * X - Cc : Cc - Q * X) - Q * X * COM;
  };
  return b;
}

// ---------------------------------------------------------------- 🔴1 stopul la zero / podeaua țintei ----------------------------------------------------------------
await test("🔴1 long pe plus: la prețul de zero totalul cu grilele cumpărate pe drum e ≈ 0 (era −71,5), iar proba celulă cu celulă nu iese pe minus", () => {
  const b = botConstruit(), z = TE.dacaInchizi(b);
  assert.ok(z.pretZero > 0 && z.pretZero < b.pretCurent, "zero-ul sub preț: " + z.pretZero);
  assert.ok(Math.abs(TE.totalCuGridLa(b, z.pretZero)) < 0.05, "totalul la zero = " + TE.totalCuGridLa(b, z.pretZero));
  assert.ok(b.independent(z.pretZero) >= -0.05, "proba independentă la zero = " + b.independent(z.pretZero));
  assert.ok(Math.abs(z.distantaZeroPct - (z.pretZero / b.pretCurent - 1)) < 1e-12);
});
await test("🔴1 podeaua țintei (pretPentruTotal): la +10 / +8 / +5 totalul cu grilele pe drum e ținta (era +8,8 / +1,1 / −19,4)", () => {
  const b = botConstruit();
  for (const T of [10, 8, 5]) {
    const x = TE.pretPentruTotal(b, T);
    assert.ok(x > 0 && x < b.pretCurent, "podeaua +" + T + " = " + x);
    assert.ok(Math.abs(TE.totalCuGridLa(b, x) - T) < 0.05, "+" + T + ": totalul la podea " + TE.totalCuGridLa(b, x));
    assert.ok(b.independent(x) >= T - 0.05, "+" + T + ": proba independentă " + b.independent(x));
  }
});
await test("🔴1 planStare: podeaua, „cât păstrează stopul de acum” și „stopul care urcă” pe același model (grilele pe drum)", () => {
  const b = Object.assign(botConstruit(), { opritorPierdereActiv: true, opritorPierdere: 1.0 });
  const ps = TE.planStare(b, { plus: 5 }, {}, 0);
  assert.ok(Math.abs(TE.totalCuGridLa(b, ps.plus.podea) - 5) < 0.05, "podeaua: " + TE.totalCuGridLa(b, ps.plus.podea));
  assert.ok(Math.abs(ps.plus.opritorPastreaza - TE.totalCuGridLa(b, 1.0)) < 1e-9, "stopul de acum păstrează " + ps.plus.opritorPastreaza + ", nu " + TE.totalCuGridLa(b, 1.0));
  const u = ps.plus.urca;
  assert.ok(u && Math.abs(u.pastrezi - TE.totalCuGridLa(b, u.pret)) < 1e-9, "stopul care urcă: " + (u && u.pastrezi));
  assert.ok(Math.abs(u.opritorPastreaza - TE.totalCuGridLa(b, 1.0)) < 1e-9);
});
await test("🔴1 short pe plus (oglinda): la zero-ul de deasupra prețului totalul cu grilele VÂNDUTE pe drum e ≈ 0", () => {
  const b = botConstruit({ dir: "short", P1: 0.92 }), z = TE.dacaInchizi(b);
  assert.ok(nrPoz(b) && z.pretZero > b.pretCurent, "zero-ul peste preț: " + z.pretZero);
  assert.ok(Math.abs(TE.totalCuGridLa(b, z.pretZero)) < 0.05, "totalul la zero = " + TE.totalCuGridLa(b, z.pretZero));
  assert.ok(b.independent(z.pretZero) >= -0.05, "proba independentă = " + b.independent(z.pretZero));
  const x = TE.pretPentruTotal(b, 4); assert.ok(Math.abs(TE.totalCuGridLa(b, x) - 4) < 0.05, "podeaua short +4: " + TE.totalCuGridLa(b, x));
});
function nrPoz(b) { return Math.abs(b.pozitie) > 0; }
// long căzut de la 1,00 la 0,93, cu 12 USDT pierduți înainte (stopuri, funding): la marginea de sus, fără poziție, totalul rămâne pe minus
function adancPeMinus() { const d = botConstruit({ P0: 1.0, P1: 0.93 }); d.profitNet -= 12; d.profitTotal -= 12; return d; }
await test("🔴1 fără geometria Pionex (row / perVolume lipsă): ca înainte, pe poziția de acum (VVV din 27.09)", () => {
  const vvv = { directie: "long", pozitie: 5.9, pretDeschidere: 30.291071485268713, profitNet: 1.535324366794896, pretCurent: 30.756, profitTotal: 4.28, investit: 91.9, gridJos: 28.464, gridSus: 33.346 };
  const x = TE.pretPentruTotal(vvv, 3), vechi = (5.9 * vvv.pretDeschidere - vvv.profitNet + 3) / (5.9 * (1 - COM));
  assert.ok(Math.abs(x - vechi) < 1e-6, x + " față de " + vechi);
  assert.ok(Math.abs(TE.dacaInchizi(vvv).pretZero - (5.9 * vvv.pretDeschidere - vvv.profitNet) / (5.9 * (1 - COM))) < 1e-6);
});
await test("🔴1 long pe minus: zero-ul de deasupra ține cont de ce vinde gridul pe drum; neatins în grid ⇒ pretZero null + zeroNeatins", () => {
  const b = botConstruit({ P0: 1.0, P1: 0.97 }), z = TE.dacaInchizi(b);
  assert.ok(b.profitTotal < 0, "pe minus: " + b.profitTotal);
  if (z.pretZero !== null) { assert.ok(z.pretZero > b.pretCurent); assert.ok(Math.abs(TE.totalCuGridLa(b, z.pretZero)) < 0.05, "la zero: " + TE.totalCuGridLa(b, z.pretZero)); }
  else assert.equal(z.zeroNeatins, true);
  // adânc pe minus (pornit sus, căzut sub mijloc): pe drumul în sus gridul vinde tot până la marginea de sus, unde totalul rămâne pe minus
  const d = adancPeMinus(), zd = TE.dacaInchizi(d);
  assert.ok(TE.totalCuGridLa(d, d.gridSus) < 0, "la marginea de sus tot pe minus: " + TE.totalCuGridLa(d, d.gridSus));
  assert.equal(zd.pretZero, null, "nu inventa un zero dincolo de grid: " + zd.pretZero); assert.equal(zd.zeroNeatins, true);
});
await test("🔴1 cartela Stopul: „l-aș muta la X (zero-ul botului)” - la X proba celulă cu celulă nu iese pe minus", () => {
  const b = botConstruit(), z = TE.dacaInchizi(b), c = S.acumConcret({ bot: b, fisa: null, zero: z, costuri: {}, plan: null });
  const st = c.filter((x) => x.cod === "stop")[0];
  assert.ok(st.pretPropus > 0, "propune stop la zero"); assert.ok(b.independent(st.pretPropus) >= -0.05, "la stopul propus: " + b.independent(st.pretPropus));
  assert.match(st.act, /zero-ul botului/);
});
await test("🔴1 cartela Stopul la zero-ul neatins (adânc pe minus): protecția tot se propune, nu „nu se poate socoti încă”", () => {
  const d = adancPeMinus(), z = TE.dacaInchizi(d), c = S.acumConcret({ bot: d, fisa: null, zero: z, costuri: {}, plan: null });
  const st = c.filter((x) => x.cod === "stop")[0];
  assert.doesNotMatch(st.text + " " + st.act, /nu se poate socoti/);
  assert.match(st.text, /sub gridul de jos/); assert.match(st.text, /nu mai ajunge pe zero|nu ajunge pe zero/);
});
await test("🔴1 alerta „ținta e atinsă — păstreaz-o” (pleacă pe Discord): la prețul din mesaj totalul cu grilele pe drum e cel puțin ținta", () => {
  const b = Object.assign(botConstruit(), { id: "1", baza: "TEST.PERP", activ: true }), plan = TE.planStare(b, { plus: 5, minus: 30 }, {}, 0);
  const r = A.reguli(b, { plan: plan, regim: { miscare: false, r4h: 1, r24h: 1 } }).plan;
  assert.match(r.titlu, /păstreaz-o/);
  const m = /stopul din Pionex la ([\d.]+)/.exec(r.mesaj); assert.ok(m, r.mesaj);
  assert.ok(TE.totalCuGridLa(b, Number(m[1])) >= 5 - 0.1, "la " + m[1] + ": " + TE.totalCuGridLa(b, Number(m[1])));
});

// ---------------------------------------------------------------- 🟡 B3 stopul dincolo de lichidare ----------------------------------------------------------------
function botLich(L) {
  const jos = 0.85, sus = 1.0, N = 20, P = 0.99, inv = 100, lq = G.lichidare(G.niveluri(jos, sus, N), P, "long", L), pv = inv * L / N / 0.92;
  return { id: "9", baza: "LIQ.PERP", activ: true, directie: "long", investit: inv, levier: L, pozitie: pv, pretDeschidere: 0.995, pretCurent: P, profitNet: -0.2, profitTotal: -0.2 + pv * (P - 0.995), gridJos: jos, gridSus: sus,
    opritorPierdereActiv: true, opritorPierdere: 0.84, pretLichidare: lq.jos, distantaLichidarePct: (P - lq.jos) / P * 100, brut: { buOrderData: { row: N + 1, perVolume: pv, gridType: "geometric" } } };
}
await test("🟡 B3 stopul de dincolo de lichidare: roșu „stopul nu apucă: lichidarea vine întâi”, nu verde „pus — L-aș lăsa”", () => {
  for (const L of [12, 15, 20]) {
    const b = botLich(L); assert.ok(b.opritorPierdere <= b.pretLichidare, L + "×: stopul chiar e dincolo");
    const c = S.acumConcret({ bot: b, fisa: null, zero: TE.dacaInchizi(b), costuri: {}, plan: null }), st = c.filter((x) => x.cod === "stop")[0];
    assert.equal(st.tag.c, "bad", L + "×: " + JSON.stringify(st.tag)); assert.match(st.tag.t, /lichidarea vine întâi/); assert.doesNotMatch(st.act, /^L-aș lăsa/);
  }
});
await test("🟡 B3 pierderea la stop e plafonată la marjă (izolată): niciodată peste investiție", () => {
  for (const L of [12, 15, 20]) { const b = botLich(L), t = TE.totalLaOpritor(b); assert.ok(t >= -b.investit - 1e-9, L + "×: " + t); }
  const b = botLich(15), ps = TE.planStare(b, { minus: 10 }, {}, 0);
  const r = A.reguli(b, { plan: ps })["plan-stop"];
  assert.ok(r && /lichidarea vine întâi/.test(r.mesaj), r && r.mesaj); assert.doesNotMatch(r.mesaj, /1[0-9]{2}% din investiție/);
  assert.equal(r.nivel, "critic");
});
await test("🟡 B3 stopul de dinaintea lichidării rămâne cum era (verde „pus” sub grid)", () => {
  const b = Object.assign(botLich(3), {}), c = S.acumConcret({ bot: b, fisa: null, zero: TE.dacaInchizi(b), costuri: {}, plan: null }), st = c.filter((x) => x.cod === "stop")[0];
  assert.ok(!(b.opritorPierdere <= b.pretLichidare)); assert.equal(st.tag.t, "pus"); assert.equal(st.tag.c, "good");
});

// ---------------------------------------------------------------- 🔴 grafic-bot: „0 %” la lichidare ----------------------------------------------------------------
await test("🔴 grafic: lichidarea în 7 zile nu mai apare „0%” - „< 1%” cu marginea de sus a intervalului", () => {
  const niv = [{ k: "lich", pret: 0.8 }, { k: "gridJos", pret: 0.9 }];
  const r = GB.cuSanse(niv, [{ cod: "lichidare", p: 0.002, ic: [0, 0.16], titlu: "Atinge lichidarea în 7 zile" }, { cod: "iese-jos-24", p: 0.999, ic: [0.9, 1], titlu: "Atinge marginea de jos în 24 h" }]);
  const l = r.filter((x) => x.k === "lich")[0], g = r.filter((x) => x.k === "gridJos")[0];
  assert.equal(l.sansaScurt, "< 1%"); assert.match(l.sansa, /< 1%.*16%/); assert.match(l.sansaLung, /16%/); assert.doesNotMatch(l.sansa + l.sansaLung, /(^|[^\d,])0%/);
  assert.equal(g.sansaScurt, "> 99%");
  const z = GB.cuSanse(niv, [{ cod: "lichidare", p: 0, ic: [0, 0.08], titlu: "x" }]).filter((x) => x.k === "lich")[0];
  assert.equal(z.sansaScurt, "< 1%"); assert.match(z.sansa, /8%/);
  const n = GB.cuSanse(niv, [{ cod: "lichidare", p: 0.034, ic: [0.01, 0.1], titlu: "x" }]).filter((x) => x.k === "lich")[0];
  assert.equal(n.sansaScurt, "3%");
});

// ---------------------------------------------------------------- 🟡 B1 / B2 simulatorul grid ----------------------------------------------------------------
// 31 de zile de bare de 15 minute: primele 15 o cădere agitată, ultimele 16 un lateral liniștit (două regimuri - ca SOL 32% / 70% în audit)
function bare15(zile, seed) {
  const rnd = M.generator(seed || 7), out = []; let p = 1, t = Date.parse("2026-09-01T00:00:00Z");
  for (let i = 0; i < zile * 96; i++) {
    const zi = Math.floor(i / 96), cad = zi < 15, s = cad ? 0.006 : 0.0025, mu = cad ? -0.0004 : 0, u = (rnd() + rnd() + rnd() - 1.5) * 2 * s;
    const o = p, c = o * Math.exp(mu + u), h = Math.max(o, c) * (1 + rnd() * s), l = Math.min(o, c) * (1 - rnd() * s);
    out.push({ t: t + i * 900000, o, h, l, c, v: 1 }); p = c;
  }
  return out;
}
const B31 = bare15(31), P31 = B31[B31.length - 1].c;
const ST31 = { jos: P31 * 0.92, sus: P31 * 1.08, grile: 20, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "geometric" };
const REZ31 = GS.simuleaza(B31, ST31, { n: 500, orizonturi: [1, 3, 7] });
await test("🟡 B1 marja nu mai e doar zgomotul celor 500 de drumuri: e pe zile (din ~31 de zile distincte) și e mai mare", () => {
  const o7 = REZ31.orizonturi[2];
  assert.ok(o7.marjaDrumuri >= 1 && o7.marjaDrumuri <= 5, "marja din drumuri " + o7.marjaDrumuri);
  assert.ok(o7.marjaZile > o7.marjaDrumuri, "pe zile " + o7.marjaZile + " față de " + o7.marjaDrumuri);
  assert.equal(o7.marja, Math.max(o7.marjaZile, o7.marjaDrumuri)); assert.equal(o7.zileDistincte, 31);
  const v = GS.verdict(REZ31, ST31, null, 2, null);
  assert.match(v.marja, /^±\d+ (de )?puncte, din ~31 de zile distincte de istoric$/);
});
await test("🟡 B1 reluarea istoricului REAL (pornit în fiecare zi, cu tendința reală): n, media, ferestrele independente", () => {
  const r7 = REZ31.orizonturi[2].reluare, r1 = REZ31.orizonturi[0].reluare;
  assert.ok(r7 && r7.n === 31 - 7 + 1, "porniri pe 7 zile: " + (r7 && r7.n)); assert.equal(r7.independente, 4);
  assert.ok(isFinite(r7.media) && r7.pPlus >= 0 && r7.pPlus <= 1);
  assert.equal(r1.n, 31); assert.equal(r1.independente, 31);
  // botul care rulează: „de aici încolo” nu are reluare de bot nou
  const meu = GS.simuleaza(B31, ST31, { n: 120, orizonturi: [1], pornitLa: B31[B31.length - 200].t });
  assert.equal(meu.orizonturi[0].reluare, null);
});
// verdictul e pur pe rezultat - cazurile construite
const oriz = (o) => Object.assign({ zile: 7, bare: 672, pCastig: 0.7, pPierde: 0.3, pZero: 0, p5: -2, p50: 1, p95: 3, marja: 4, marjaDrumuri: 4, marjaZile: 4, zileDistincte: 31, plan: null, pLich: 0, pStop: 0.1, pTp: 0, pIesire: 0.3, perechi: 5, funding: 0, reluare: { n: 25, media: 0.8, pPlus: 0.6, independente: 4 } }, o);
const rezDe = (o) => ({ n: 500, zile: 14, zileIstoric: 31, orizonturi: [oriz(o)], acum: null });
await test("🟡 B1 „Aș porni” cere: P ≥ 55, mediana > 0, marginea de jos a incertitudinii peste 50% ȘI media pe istoria reală > 0", () => {
  assert.match(GS.verdict(rezDe({}), ST31, null, 0, null).faCe, /^Aș porni/);
  const larg = GS.verdict(rezDe({ marja: 30, marjaZile: 30 }), ST31, null, 0, null);
  assert.match(larg.faCe, /^O aruncare de ban/); assert.match(larg.faCe, /±30 de puncte/); assert.equal(larg.culoare, "mijl");
  const real = GS.verdict(rezDe({ reluare: { n: 25, media: -0.5, pPlus: 0.4, independente: 4 } }), ST31, null, 0, null);
  assert.match(real.faCe, /^O aruncare de ban/); assert.match(real.faCe, /istoria reală/); assert.match(real.faCe, /−0,5 USDT/);
  const fara = GS.verdict(rezDe({ reluare: null }), ST31, null, 0, null);
  assert.match(fara.faCe, /^O aruncare de ban/);
});
await test("🟡 B1 pe drumurile din audit (31 de zile, două regimuri) verdictul nu mai iese „Aș porni” doar din P ≥ 55", () => {
  const v = GS.verdict(REZ31, ST31, null, 2, null), o7 = REZ31.orizonturi[2];
  if (/^Aș porni/.test(v.faCe)) { assert.ok(Math.round(o7.pCastig * 100) - o7.marja > 50 && o7.reluare.media > 0, "Aș porni fără confirmare: " + v.faCe); }
  assert.ok(true);
});
await test("🟡 B2 orice lichidare pe drumuri ⇒ „N-aș porni” (era tolerată până la 2%), cu „sub 1%” în loc de „0%”", () => {
  const v = GS.verdict(rezDe({ pLich: 0.004 }), ST31, null, 0, null);
  assert.match(v.faCe, /^N-aș porni/); assert.match(v.faCe, /sub 1%/); assert.doesNotMatch(v.faCe, /(^|[^\d,])0%/);
  assert.match(GS.verdict(rezDe({ pLich: 0.019 }), ST31, null, 0, null).faCe, /^N-aș porni așa: lichidare în 2%/);
  assert.match(GS.verdict(rezDe({ pLich: 0 }), ST31, null, 0, null).faCe, /^Aș porni/);
});
await test("🟡 B2 „Stopul e în zgomot” nu mai îndeamnă „renunță la el”: mută-l dincolo de o zi obișnuită", () => {
  const v = GS.verdict(rezDe({ pStop: 0.62 }), ST31, null, 0, null);
  assert.match(v.faCe, /^Stopul e în zgomot/); assert.doesNotMatch(v.faCe, /renunță/); assert.match(v.faCe, /zi obișnuită/);
});

// ---------------------------------------------------------------- 🟡 B4 funding-ul în fișă / ÎNGUST-LARG / gridul îngust ----------------------------------------------------------------
await test("🟡 B4 proba fișei plătește funding: fără rată ⇒ cost presupus 0,03%/zi (ca Simulatorul); cu rată mare, platoul long scade", () => {
  const f = GP.proba(B31, 2);
  assert.deepEqual(f.funding, { rataZi: 0.0003, presupus: true });
  const zero = GP.proba(B31, 2, { rataZi: 0 }), mare = GP.proba(B31, 2, { rataZi: 0.01 });
  assert.deepEqual(zero.funding, { rataZi: 0, presupus: false });
  assert.ok(mare.pe.long.platou < zero.pe.long.platou, mare.pe.long.platou + " față de " + zero.pe.long.platou);
  const fi = GP.fisa({ pret: P31, b15: B31, b4h: G.agrega(B31, 4 * 3600000), b1d: G.agrega(B31, 86400000), H: 2, suma: 100, levier: 3, fundingZi: 0.002 });
  assert.deepEqual(fi.proba.funding, { rataZi: 0.002, presupus: false });
});
await test("🟡 B4 ÎNGUST / LARG (GridPlan.proba): media pe pornire cu funding-ul monedei; fără rată, costul presupus", () => {
  const st = GPl.variante({ pret: P31, dir: "long", suma: 100, levier: 3, plan: { plus: 3, minus: 6 }, amp: 0.05, b15: B31, zile: 20 }).ta;
  const p0 = GPl.proba(B31, st, 20, { rataZi: 0 }), pm = GPl.proba(B31, st, 20, { rataZi: 0.01 }), pd = GPl.proba(B31, st, 20);
  assert.ok(pm.mediaUsdt < p0.mediaUsdt, pm.mediaUsdt + " față de " + p0.mediaUsdt);
  assert.deepEqual(pd.funding, { rataZi: 0.0003, presupus: true });
  assert.ok(st.proba && st.proba.funding && st.proba.funding.presupus === true, "variante() trece funding-ul în proba ferestrei");
  const cuRata = GPl.variante({ pret: P31, dir: "long", suma: 100, levier: 3, plan: { plus: 3, minus: 6 }, amp: 0.05, b15: B31, zile: 20, fundingZi: 0.001 }).ta;
  assert.deepEqual(cuRata.proba.funding, { rataZi: 0.001, presupus: false });
});
await test("🟡 B4 gridul îngust spune funding-ul folosit", () => {
  const r = GP.ingust(B31, { dir: "long", pret: P31, suma: 100, levier: 3 });
  assert.deepEqual(r.funding, { rataZi: 0.0003, presupus: true }, JSON.stringify(r).slice(0, 200));
  assert.deepEqual(GP.ingust(B31, { dir: "long", pret: P31, fundingZi: -0.0005 }).funding, { rataZi: -0.0005, presupus: false });
});

// ---------------------------------------------------------------- 🟡 B5 cea mai bună din 36, pe ~6 ferestre ----------------------------------------------------------------
const STAT_BUN = { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.01, lichidari: 0 } };
await test("🟡 B5 sub 10 ferestre independente de test ⇒ fișa nu zice PORNEȘTE; spune câte combinații s-au încercat", () => {
  const v = G.verdict({ regim: { miscare: false }, stat: STAT_BUN, zile: 31, pozitie: 0.5, ferestreTest: 5, incercate: 36 });
  assert.equal(v.nivel, "asteapta"); assert.ok(v.motive.some((m) => /5 ferestre independente/.test(m) && /36 de combinații/.test(m)), v.motive.join(" | "));
  assert.equal(G.verdict({ regim: { miscare: false }, stat: STAT_BUN, zile: 31, pozitie: 0.5, ferestreTest: 12, incercate: 36 }).nivel, "porneste");
  assert.equal(G.verdict({ regim: { miscare: false }, stat: STAT_BUN, zile: 31, pozitie: 0.5 }).nivel, "porneste", "fără câmpuri (chemătorii vechi): ca înainte");
});
await test("🟡 B5 proba spune ferestrele independente de test și combinațiile; fișa le trece verdictului", () => {
  const pr = GP.proba(B31, 2);
  assert.equal(pr.incercate, pr.latimi.length * pr.pasi.length * 3);
  assert.equal(pr.ferestre.testIndependente, Math.floor((B31.length - Math.round(B31.length * 2 / 3)) / 192));
  const fi = GP.fisa({ pret: P31, b15: B31, b4h: G.agrega(B31, 4 * 3600000), b1d: G.agrega(B31, 86400000), H: 2, suma: 100, levier: 3 });
  assert.notEqual(fi.verdict.nivel, "porneste"); assert.ok(fi.verdict.motive.some((m) => /ferestre independente/.test(m)), fi.verdict.motive.join(" | "));
});

// ---------------------------------------------------------------- 🔵 sugestiile ----------------------------------------------------------------
globalThis.escapeHtml = globalThis.escapeHtml || ((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
for (const f of ["tablou-bot.js", "disciplina.js", "monte-simbol-ecran.js"]) vm.runInThisContext(LIB(f), { filename: f });
const { TabloBot: TB, Disciplina: DIS } = globalThis;
await test("🔵1 graficul Tabloului (geometrieGrafic): la short desenează lichidarea de SUS (Pionex dă jos „0”)", () => {
  const ist = Array.from({ length: 30 }, (_, i) => ({ t: 1e12 + i * 60000, pretPerp: 0.0155 + (i % 3) * 0.0001 }));
  const sh = { buOrderData: { bottom: "0.0140", top: "0.0170", estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "0.0180" } };
  const g = TB.geometrieGrafic(ist, sh, 1e12 + 31 * 60000);
  assert.ok(g.destul); assert.ok(g.lichidare !== null && g.lichidare > 0.9, "linia de sus: " + g.lichidare);
  const lg = { buOrderData: { bottom: "0.0140", top: "0.0170", estimateLiquidationPriceDown: "0.0130", estimateLiquidationPriceUp: "0" } };
  const g2 = TB.geometrieGrafic(ist, lg, 1e12 + 31 * 60000); assert.ok(g2.lichidare !== null && g2.lichidare < 0.1, "long: jos " + g2.lichidare);
});
await test("🔵2 botul NEUTRU cu stopul doar deasupra prețului: stopul e „sus” (Simulator și Monte Carlo), nu „jos”", () => {
  const b = { activ: true, baza: "TST.PERP", simbol: "TST_USDT_PERP", directie: "neutral", pretCurent: 1.0, opritorPierdereActiv: true, opritorPierdere: 1.2, gridJos: 0.9, gridSus: 1.1, investit: 50, levier: 2, brut: { buOrderData: { row: 21 } } };
  assert.deepEqual(GS.setariDinBot(b).st.stop, { sus: 1.2 });
  assert.deepEqual(GS.setariDinBot(Object.assign({}, b, { opritorPierdere: 0.8 })).st.stop, { jos: 0.8 });
  assert.deepEqual(GS.setariDinBot(Object.assign({}, b, { directie: "long", opritorPierdere: 0.8 })).st.stop, { jos: 0.8 });
  const m = globalThis.mcsSetariBot([b], "TST"); assert.ok(m, "mcsSetariBot găsește botul"); assert.deepEqual(m.stop, { sus: 1.2 });
});
await test("🔵3 „Cât investesc?” nu trece de sold și ia cea mai pesimistă dintre fereastra cea mai proastă și p5 din drumuri, când e dată", () => {
  assert.equal(GP.sumaMaxima(1000, 5, -0.01), 1000, "plafonul = soldul");
  assert.equal(GP.sumaMaxima(1000, 5, -0.1), 500);
  assert.equal(GP.sumaMaxima(1000, 5, -0.1, -0.2), 250, "p5 mai rău decât fereastra ⇒ p5");
  assert.equal(GP.sumaMaxima(1000, 5, -0.1, -0.05), 500, "fereastra mai rea ⇒ fereastra");
});
const bara = (o, h, l, c, t) => ({ t: t || 0, o, h, l, c });
await test("🔵4 ieșirea pe stop / țintă plătește alunecarea (0,1% din preț, împotriva poziției), nu doar taxa taker", () => {
  assert.equal(G.C.ALUNECARE_STOP, 0.001);
  const st = { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "long", stop: { jos: 0.85 } }, b = [bara(1, 1, 1, 1), bara(1, 1, 0.84, 0.84)];
  const cu = GP.simuleaza(b, 0, 2, st); G.C.ALUNECARE_STOP = 0; const fara = GP.simuleaza(b, 0, 2, st); G.C.ALUNECARE_STOP = 0.001;
  assert.equal(cu.iesit, "jos"); assert.ok(cu.net < fara.net, cu.net + " față de " + fara.net);
  const poz = 2 / 10 * [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, k) => s + 1 / G.niveluri(0.9, 1.1, 10)[k], 0);   // aproximativ toată poziția (long plin la stop)
  assert.ok(fara.net - cu.net > 0.0005 * 0.85 * poz * 0.5 && fara.net - cu.net < 0.0015 * 0.85 * poz, "diferența " + (fara.net - cu.net));
});
await test("🔵5 stopul și ținta în aceeași lumânare ⇒ stopul întâi (pesimist), oricare ar fi culoarea ei", () => {
  const lg = { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "long", stop: { jos: 0.92, sus: 1.08 } };
  assert.equal(GP.simuleaza([bara(1, 1, 1, 1), bara(1.0, 1.09, 0.91, 0.95)], 0, 2, lg).iesit, "jos", "lumânare roșie O→H→L→C: ținta venea întâi");
  const sh = { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "short", stop: { jos: 0.92, sus: 1.08 } };
  assert.equal(GP.simuleaza([bara(1, 1, 1, 1), bara(1.0, 1.09, 0.91, 1.05)], 0, 2, sh).iesit, "sus", "short, lumânare verde O→L→H→C: ținta (jos) venea întâi");
  assert.equal(GP.simuleaza([bara(1, 1, 1, 1), bara(1.0, 1.0, 0.91, 0.95)], 0, 2, lg).iesit, "jos", "doar stopul ⇒ stopul");
});
await test("🔵6 Simulatorul de pe pagină trage 2.000 de drumuri (cozile p5 / p95), variantele rămân pe aceleași drumuri", () => {
  const src = LIB("grid-sim-ecran.js");
  assert.match(src, /GridSim\.simuleaza\(gsStare\.date\.b15, st, \{[^}]*n: 2000, seed: 12/);
});
await test("🔵7 disciplina: „se întorc în bandă” se numără pe episoade monedă × zi, nu pe boți (40 de boți pe aceeași monedă, aceeași zi = 1 episod)", () => {
  const ORA = 3600000, T0 = Date.parse("2026-05-01T00:00:00Z"), b = [];
  for (let i = 0; i < 120; i++) b.push({ t: T0 + i * ORA, c: i >= 5 ? 85 : 100 });
  const trades = []; for (let k = 0; k < 40; k++) trades.push({ id: "b" + k, moneda: "M", jos: 90, sus: 110, dir: "long", pornit: T0, inchis: T0 + 100 * ORA, pct: -0.2 });
  const r = DIS.iesiriBanda(trades, () => b), h1 = r.tabel.find((x) => x.h === 1);
  assert.equal(h1.n, 1, "un episod"); assert.equal(h1.boti, 40, "din 40 de boți"); assert.equal(r.regula, null, "sub 30 de episoade: nicio regulă");
});

// ---------------------------------------------------------------- (SECTIUNI) ----------------------------------------------------------------

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
