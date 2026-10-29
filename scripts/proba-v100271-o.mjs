// Proba v100.271-o (ideile auditului Monte Carlo 29.10, el: „optimizează Monte Carlo, fără să strici și fără să pierzi nimic”):
// (1) drumurile țin cât cel mai lung orizont citit (7 zile), nu 14 - în colector și pe pagina botului; cifrele rămân aceleași în limita
//     zgomotului tragerii (nu la egalitate exactă: fiecare drum cere ⌈H/96⌉ trageri din generator, deci de la al doilea drum șirurile diferă,
//     iar tendința scoasă se socotește pe capătul drumurilor de H bare); funding-ul la 7 zile devine EXACT (înainte: o proporție din cel pe 14);
// (2) regimul Busolei, cât poarta nu e validată: o simulare pe oră (aceeași stare), nu la 15 minute - textul rămâne în KV;
// (3) pagina botului: barele de 15 minute ținute minte + doar ultima pagină, fără barele zilnice - aceleași bare ca aducerea întreagă;
// (4) fraza adevărată: „șanse pe drumuri trase din ultima lună de prețuri, nu o predicție” (3000 de bare de 15 minute ≈ 31 de zile).
// Fără rețea: Pionex e simulat (getJSON), ceasul e simulat. Rulare: node scripts/proba-v100271-o.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { turaMonteCarloBot, gridSimDinPagina, categorie } from "./lib/tura-monte-carlo-bot.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const GridProba = new Function("GridCalcul", lib("grid-proba.js") + "; return GridProba;")(GridCalcul);
const MonteSimbol = new Function(lib("monte-simbol.js") + "; return MonteSimbol;")();
const GS = gridSimDinPagina(lib("grid-sim.js"), GridCalcul, GridProba, MonteSimbol);
const APP = citeste("public", "app.js"), MSE = lib("monte-simbol-ecran.js"), TMC = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), COL = citeste("scripts", "colector.mjs");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); } }
console.log("\nV100.271-o · Monte Carlo mai repede, cu mai puține cereri, aceleași cifre · proba\n");

const Q = 9e5, ZI = 864e5, T = Date.UTC(2026, 9, 29, 10, 0, 0);
// bare de 15 minute sintetice (mulberry32 din MonteSimbol), ~31 de zile până la T
function bare15(zile, seed, pas) { const g = MonteSimbol.generator(seed), b = [], n = Math.round(zile * 96); let c = 1; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.012)); b.push({ t: T - (n - i) * Q, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 1 }); } return b; }
const kl = (b) => b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: 1 }));
const B = bare15(31.25, 5), K = kl(B), P0 = B[B.length - 1].c;
const bot = (o) => Object.assign({ id: "2408", activ: true, baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP", gridJos: P0 * 0.9, gridSus: P0 * 1.1, levier: 2, directie: "long", investit: 50, opritorPierdereActiv: true, opritorPierdere: P0 * 0.85, pornitLa: B[B.length - 288].t, brut: { buOrderData: { row: 11 } }, profitNet: 0.3 }, o || {});
const FER = [{ de: B[0].t, pana: B[B.length - 1].t + Q }];
const spion = (jurnal) => Object.assign({}, GS, { simuleaza: (b, st, o) => { jurnal.push({ zile: o.zile, oriz: Array.from(o.orizonturi || []), regim: o.starturi != null }); return GS.simuleaza(b, st, o); } });   /* Array.from: tablou din realmul probei, nu din vm */
const depsTura = (o) => Object.assign({ boti: [bot()], GridSim: GS, GridCalcul, stare: { boti: {} }, n: 60, randuri15: async () => K, jurnal: () => {}, anunta: async () => true, acum: T }, o || {});

// ───────────────────────── (1) 7 zile, nu 14 ─────────────────────────
await test("1a colectorul: drumurile țin cât cel mai lung orizont cerut (7 zile), nu 14 - pe verdict și pe regim; orizonturile rămân 1 h, 4 h, 1 zi, 7 zile", async () => {
  const j = [], st = { boti: {} };
  await turaMonteCarloBot(depsTura({ GridSim: spion(j), stare: st, regim: async () => ({ stare: "liniste", ferestre: FER }), regimValidat: true }));
  assert.ok(j.length >= 2 && j.some((x) => x.regim), "verdictul și regimul s-au socotit: " + JSON.stringify(j));
  for (const x of j) { assert.deepEqual(x.oriz, [1 / 24, 4 / 24, 1, 7]); assert.equal(x.zile, 7, "drumuri de " + x.zile + " zile pentru orizontul cel mai lung de 7"); }
  const s = st.boti["2408"]; assert.match(s.text, /^de aici încolo, 7 zile: /); assert.ok(Array.isArray(s.scurt) && s.scurt.length === 3, "riscul pe 1 h / 4 h / o zi rămâne");
  assert.ok(s.regim && !s.regim.eroare && /7 zile/.test(s.regim.text), "regimul rămâne: " + JSON.stringify(s.regim));
});
await test("1b pagina botului: ambele socotiri (botul reluat și „ca bot pornit acum”) cer drumuri de 7 zile, cu aceleași orizonturi", async () => {
  const j = [], ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, GridSim: spion(j), TextRo: globalThis.TextRo };
  ctx.mcsAduCoin = async () => ({ b15: B, b1: [], fundingInfo: { rataZi: 0.0002 } }); ctx.mcsSimbolBot = () => "PONS"; ctx.tbPanouVizibil = () => true; ctx.textEroare = (e) => String(e && e.message || e);
  ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) }; ctx.getJSON = async () => ({ mcVerdict: null }); ctx.tbPlan = { botId: null, plan: null }; ctx.tbDeseneazaCitire = () => {};
  ctx.tbStare = { routeOk: true, bot: bot({ pornitLa: B[0].t - 3 * ZI }), citireO: null, funding: null };   // pornit înaintea barelor ⇒ a doua socotire, ca bot nou
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + "var tbMcKv={la:0,d:null,inLucru:null};\n" + ["tbMcWorkerAsteptare", "tbMcSimuleaza", "tbMcDinKv", "tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  await ctx.tbMcTick(); for (let i = 0; i < 200 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(j.length, 2, "două socotiri: " + JSON.stringify(j)); assert.match(ctx.tbMc.rand.text, /ca bot pornit acum/);
  for (const x of j) { assert.deepEqual(x.oriz, [1 / 24, 4 / 24, 1, 7]); assert.equal(x.zile, 7); }
});
// Regula scrisă ÎNAINTE de cifre: „aceleași cifre” = în distribuție. Pe 3 boți sintetici × 6 semințe (n 500), media fiecărei cifre cu 7 zile față de
// 14 zile: probabilitățile (câștig, stop) la cel mult 4 erori standard ale tragerii (√(2·p(1−p)/(n·K))), pragul p5 la cel mult 4 erori standard
// măsurate între semințe. 12 comparații de proporții la 4 SE ⇒ ~0,1% șansă de alarmă falsă. Felul verdictului: regula de la început („pe sămânța
// 12 la fel”) a picat pe botul 1, care stă PE PRAG (stopul atins ~50% la pragul „în zgomot” de 50%): și cu 14 zile felul sare între semințe
// (3 × „ban”, 3 × „zgomot”). Regula corectă: când pe 14 zile toate semințele dau același fel, cu 7 zile la fel pe toate; când sare deja între
// semințe, cu 7 zile apar doar felurile de pe 14.
await test("1c aceleași cifre în limita zgomotului tragerii (7 vs 14 zile): câștig, prag 5% și stop la 1 zi și 7 zile, felul verdictului", () => {
  const K6 = [12, 13, 14, 15, 16, 17], N = 500, med = (v) => v.reduce((a, x) => a + x, 0) / v.length, sd = (v) => { const m = med(v); return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, v.length - 1)); };
  const cazuri = [
    [bare15(31.25, 5, 0.012), (P) => ({ jos: P * 0.9585, sus: P * 1.0415, grile: 25, levier: 5, dir: "short", suma: 162, stop: { sus: P * 1.06 }, tp: null, fundingZi: 0.0001, fundingCost: false }), 9],
    [bare15(31.25, 7, 0.008), (P) => ({ jos: P * 0.9, sus: P * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: null, fundingZi: 0.0003, fundingCost: true }), 0],
    [bare15(31.25, 11, 0.015), (P) => ({ jos: P * 0.92, sus: P * 1.08, grile: 20, levier: 3, dir: "long", suma: 100, stop: { jos: P * 0.92 }, tp: null, fundingZi: 0.0005, fundingCost: false }), 96],
  ];
  const rau = [];
  for (const [Bx, fst, inapoi] of cazuri) {
    const P = Bx[Bx.length - 1].c, st = fst(P), pornit = inapoi ? Bx[Bx.length - inapoi].t : null, col = { 7: [], 14: [] }, fel = { 7: [], 14: [] };
    for (const z of [14, 7]) for (const s of K6) {
      const r = GS.simuleaza(Bx, st, { plan: null, n: N, seed: s, orizonturi: [1 / 24, 4 / 24, 1, 7], zile: z, pornitLa: pornit, stPrefix: pornit ? st : null }), x = {};
      assert.ok(!r.eroare, r.eroare);
      for (const h of r.orizonturi) if (h.zile === 1 || h.zile === 7) { const d = h.deAici || h; x["pC" + h.zile] = d.pCastig; x["pStop" + h.zile] = h.pStop; x["p5_" + h.zile] = d.p5; }
      col[z].push(x); fel[z].push(categorie(GS.verdictScurt(r, st, null, pornit ? { profitNet: 0 } : null).faCe));
    }
    for (const k of ["pC1", "pC7", "pStop1", "pStop7"]) { const a = med(col[14].map((x) => x[k])), b = med(col[7].map((x) => x[k])), p = (a + b) / 2, se = Math.sqrt(2 * p * (1 - p) / (N * K6.length)); if (Math.abs(a - b) > 4 * se + 1e-12) rau.push(k + " " + a.toFixed(4) + " vs " + b.toFixed(4) + " (4 SE = " + (4 * se).toFixed(4) + ")"); }
    for (const k of ["p5_1", "p5_7"]) { const va = col[14].map((x) => x[k]), vb = col[7].map((x) => x[k]), s2 = Math.sqrt((sd(va) ** 2 + sd(vb) ** 2) / 2), se = s2 * Math.sqrt(2 / K6.length); if (Math.abs(med(va) - med(vb)) > 4 * se + 1e-9) rau.push(k + " " + med(va).toFixed(3) + " vs " + med(vb).toFixed(3) + " (4 SE = " + (4 * se).toFixed(3) + ")"); }
    const f14 = new Set(fel[14]), f7 = new Set(fel[7]);
    if (f14.size === 1 ? !(f7.size === 1 && f7.has(fel[14][0])) : [...f7].some((x) => !f14.has(x))) rau.push("felul: " + fel[14].join(",") + " vs " + fel[7].join(","));
  }
  assert.deepEqual(rau, [], "diferențe peste zgomotul tragerii: " + rau.join(" · "));
});
await test("1d funding-ul la 7 zile: cu drumuri de 7 zile e EXACT suma plăților pe primele 7 zile ale fiecărui drum (cu 14 era o proporție liniară din cel pe 14 zile)", () => {
  const Bx = bare15(31.25, 11, 0.015), P = Bx[Bx.length - 1].c, st = { jos: P * 0.92, sus: P * 1.08, grile: 20, levier: 3, dir: "long", suma: 100, stop: { jos: P * 0.92 }, tp: null, fundingZi: 0.0005, fundingCost: false };
  const masoara = (zile) => {
    const adevar = [], GP = Object.assign({}, GridProba, { simuleaza: (b, s, len, stS, opt) => { if (b !== Bx && s === 0 && opt && opt.traseu) adevar.push(GridProba.simuleaza(b, 0, Math.min(len, 7 * 96), stS, opt).funding); return GridProba.simuleaza(b, s, len, stS, opt); } });
    const G2 = gridSimDinPagina(lib("grid-sim.js"), GridCalcul, GP, MonteSimbol), r = G2.simuleaza(Bx, st, { plan: null, n: 300, seed: 12, orizonturi: [1 / 24, 4 / 24, 1, 7], zile });
    const o7 = r.orizonturi.find((h) => h.zile === 7); return { raportat: o7.funding, adevarat: adevar.reduce((a, x) => a + x, 0) / adevar.length * st.suma };
  };
  const z7 = masoara(7), z14 = masoara(14);
  assert.ok(Math.abs(z7.raportat - z7.adevarat) < 1e-9, "7 zile: raportat " + z7.raportat + " vs adevărat " + z7.adevarat);
  assert.ok(Math.abs(z14.raportat - z14.adevarat) > 1e-4, "14 zile era aproximativ (proporția liniară): " + JSON.stringify(z14));
});

// ───────────────────────── (2) regimul o dată pe oră, cât e nevalidat ─────────────────────────
await test("2 regimul Busolei NEVALIDAT: o simulare pe oră pe aceeași stare (nu la 15 min), textul rămâne în stare / KV; starea schimbată, validarea sau Busola tăcută ⇒ ca înainte", async () => {
  const j = [], st = { boti: {} }, stare = { v: "liniste", tace: false }, MIN = 60000;
  const d = (acum, validat) => depsTura({ GridSim: spion(j), stare: st, acum, regim: async () => (stare.tace ? null : { stare: stare.v, ferestre: FER }), regimValidat: validat });
  const reg = () => j.filter((x) => x.regim).length;
  let primul = null;
  for (let i = 0; i <= 5; i++) {
    await turaMonteCarloBot(d(T + i * 15 * MIN, false));
    const r = st.boti["2408"].regim; assert.ok(r && r.stare === "liniste" && r.nevalidat === true && r.text, "tura " + i + ": regimul e în stare (pentru KV): " + JSON.stringify(r));
    if (i === 0) primul = r.text; else assert.equal(r.text, primul, "textul ținut până la socotirea următoare");
  }
  assert.equal(reg(), 2, "nevalidat ⇒ la T și la T + 60 min (și nu iar la T + 75), nu la fiecare tură (" + reg() + ")");
  j.length = 0; stare.v = "miscare"; await turaMonteCarloBot(d(T + 90 * MIN, false));
  assert.equal(reg(), 1, "starea Busolei schimbată ⇒ din nou, imediat"); assert.equal(st.boti["2408"].regim.stare, "miscare");
  j.length = 0; for (let i = 0; i < 3; i++) await turaMonteCarloBot(d(T + (105 + i * 15) * MIN, true));
  assert.equal(reg(), 3, "validat ⇒ la fiecare tură, ca înainte"); assert.equal(st.boti["2408"].regim.nevalidat, false);
  j.length = 0; await turaMonteCarloBot(d(T + 145 * MIN, false));
  assert.equal(reg(), 1, "poarta căzută după validare ⇒ socotit din nou (textul validat nu rămâne pe ecran o oră)"); assert.equal(st.boti["2408"].regim.nevalidat, true);
  stare.tace = true; await turaMonteCarloBot(d(T + 160 * MIN, false)); assert.equal(st.boti["2408"].regim, null, "Busola fără stare ⇒ fără regim, ca înainte");
});

// ───────────────────────── (3) pagina botului: barele ținute minte ─────────────────────────
// Pionex simulat: o serie de 15 minute de la t0 încolo; bara în curs (cea care conține „acum”) are valori parțiale; paginile de 500 cu endTime,
// cea mai nouă întâi; 1D: 200 de bare; funding: câteva rate. contor = cererile pe fel; pica(url) ⇒ aruncă.
function pionexFals(t0, seed, ceas) {
  const g = MonteSimbol.generator(seed), serie = []; let c = 1;
  const bara = (i) => { while (serie.length <= i) { const o = c; c = c * Math.exp((g() - 0.5) * 0.012); serie.push({ o, c, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998 }); } return serie[i]; };
  const contor = { m15: 0, d1: 0, funding: 0, kv: 0 }, f = { pica: null, refuza: null };
  const rand = (i, acum) => { const x = bara(i), t = t0 + i * Q, fr = Math.min(1, (acum - t) / Q), cc = x.o + (x.c - x.o) * fr; return { time: t, open: x.o, high: Math.max(x.o, cc) * 1.001, low: Math.min(x.o, cc) * 0.999, close: cc, volume: 1 }; };
  const getJSON = async (url) => {
    const u = new URL("http://x" + url), acum = ceas.now;
    if (f.pica && f.pica(url)) throw new Error("Pionex n-a răspuns (probă)");
    if (u.searchParams.get("action") === "mcVerdict") { contor.kv++; return { mcVerdict: null }; }
    if (u.searchParams.get("type") === "pionex_funding") { contor.funding++; return { data: { rates: [{ t: acum - 3600000, r: 0.0001 }] } }; }
    if (u.searchParams.get("interval") === "1D") { contor.d1++; return { data: { klines: Array.from({ length: 200 }, (_, i) => ({ time: acum - (200 - i) * ZI, open: 1, high: 1.1, low: 0.9, close: 1, volume: 1 })) } }; }
    contor.m15++;
    if (f.refuza && f.refuza(url)) return { result: false, code: "TOO_MANY_REQUESTS", message: "prea multe cereri (probă)" };
    const lim = Number(u.searchParams.get("limit")) || 500, end = u.searchParams.get("endTime") ? Number(u.searchParams.get("endTime")) : acum;
    let ult = Math.floor((Math.min(end, acum) - t0) / Q); if (ult < 0) return { data: { klines: [] } };
    const out = []; for (let i = ult; i >= 0 && out.length < lim; i--) out.push(rand(i, acum));
    return { data: { klines: out } };
  };
  return { getJSON, contor, f };
}
function ctxMcs(ceas, pf) {
  const ctx = { console, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, encodeURIComponent, GridCalcul, getJSON: pf.getJSON, mcsPauza: async () => {}, gsRataFunding: (r) => (r && r.length ? { rataZi: 0.0003 } : null) };
  ctx.Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.now); } static now() { return ceas.now; } };
  const fn = ["mcsPionexFel", "mcsAduCoin"].concat(/function mcsLipesteBare\(/.test(MSE) ? ["mcsLipesteBare"] : []);
  vm.createContext(ctx); vm.runInContext(fn.map((n) => functie(MSE, n)).join("\n"), ctx);
  return ctx;
}
const J = (x) => JSON.stringify(x);
await test("3a mcsAduCoin pe drumul paginii botului: întâi întreg fără barele zilnice; apoi DOAR ultima pagină lipită de barele ținute minte - aceleași bare ca aducerea întreagă", async () => {
  const ceas = { now: T + 7 * 60000 }, pf = pionexFals(T - 40 * ZI, 3, ceas), ctx = ctxMcs(ceas, pf);
  const c1 = await ctx.mcsAduCoin("PONS", { fara1D: true });
  assert.deepEqual({ ...pf.contor }, { m15: 6, d1: 0, funding: 1, kv: 0 }, "prima dată: 6 pagini + funding, fără 1D"); assert.equal(c1.b1.length, 0); assert.equal(c1.b15.length, 2999); assert.equal(c1.intreg, true);
  let vechi = c1.b15;
  for (let k = 1; k <= 4; k++) {
    ceas.now += 15 * 60000 + 1000; pf.contor.m15 = pf.contor.d1 = pf.contor.funding = 0;
    const c = await ctx.mcsAduCoin("PONS", { fara1D: true, vechi });
    assert.deepEqual({ m15: pf.contor.m15, d1: pf.contor.d1, funding: pf.contor.funding }, { m15: 1, d1: 0, funding: 1 }, "împrospătarea " + k + ": o pagină + funding");
    const intreg = await ctx.mcsAduCoin("PONS");
    assert.equal(J(c.b15), J(intreg.b15), "împrospătarea " + k + ": aceleași bare ca aducerea întreagă"); assert.equal(J(c.fundingInfo), J(intreg.fundingInfo)); assert.equal(c.intreg, true);
    vechi = c.b15;
  }
});
await test("3b pagina monedei / Simulatorul (fără opțiuni): ca înainte - 6 pagini + barele zilnice + funding", async () => {
  const ceas = { now: T + 7 * 60000 }, pf = pionexFals(T - 40 * ZI, 3, ceas), ctx = ctxMcs(ceas, pf);
  const c = await ctx.mcsAduCoin("PONS");
  assert.deepEqual({ ...pf.contor }, { m15: 6, d1: 1, funding: 1, kv: 0 }); assert.equal(c.b15.length, 2999); assert.equal(c.b1.length, 199); assert.ok(c.fundingInfo && c.fundingInfo.rataZi === 0.0003);
});
await test("3c gaura (barele ținute sunt de acum 6 zile, peste o pagină), pagina picată sau aducerea întreagă incompletă ⇒ aducerea întreagă, ca înainte; moneda nouă (sub 31 de zile) merge și ea", async () => {
  const ceas = { now: T + 7 * 60000 }, pf = pionexFals(T - 40 * ZI, 3, ceas), ctx = ctxMcs(ceas, pf);
  const c1 = await ctx.mcsAduCoin("PONS", { fara1D: true });
  ceas.now += 6 * ZI; pf.contor.m15 = 0;
  const c2 = await ctx.mcsAduCoin("PONS", { fara1D: true, vechi: c1.b15 }), i2 = await ctx.mcsAduCoin("PONS");
  assert.equal(pf.contor.m15, 6 + 6, "gaura ⇒ aducerea întreagă (fără pagina în plus)"); assert.equal(J(c2.b15), J(i2.b15));
  /* revizia 29.10: pagina de împrospătare picată (Pionex blocat / 429) ⇒ eroarea, FĂRĂ aducerea întreagă (înainte: două cereri eșuate la 15 min) */
  ceas.now += 15 * 60000 + 1000; pf.contor.m15 = 0; let cereri = 0; pf.f.pica = (u) => /interval=15M/.test(u) && cereri++ === 0;
  await assert.rejects(ctx.mcsAduCoin("PONS", { fara1D: true, vechi: c2.b15 }), /Pionex n-a răspuns acum/); pf.f.pica = null;
  assert.equal(pf.contor.m15 + cereri - pf.contor.m15, 1, "o singură cerere când Pionex pică"); assert.equal(cereri, 1, "după pagina picată a mai plecat o cerere 15M");
  let n15 = 0; pf.f.pica = (u) => /interval=15M/.test(u) && ++n15 === 3;   // a treia pagină a aducerii întregi pică ⇒ istoric incomplet
  const c4 = await ctx.mcsAduCoin("PONS", { fara1D: true }); pf.f.pica = null;
  assert.equal(c4.intreg, false, "aducerea întreagă oprită de o eroare nu e „întreagă” (pagina botului n-o lipește)"); assert.ok(c4.b15.length < 2999 && c4.b15.length > 0);
  let m15r = 0; pf.f.refuza = (u) => /interval=15M/.test(u) && ++m15r === 4;   // a patra pagină: răspuns de eroare (429), nu excepție
  const c5 = await ctx.mcsAduCoin("PONS", { fara1D: true }); pf.f.refuza = null;
  assert.equal(c5.intreg, false, "și pagina refuzată (fără excepție) taie istoricul"); assert.equal(c5.b15.length, 3 * 500 - 1);
  const ceasN = { now: T + 7 * 60000 }, pn = pionexFals(T - 10 * ZI, 9, ceasN), cn = ctxMcs(ceasN, pn), n1 = await cn.mcsAduCoin("NOU", { fara1D: true });
  assert.equal(n1.intreg, true); assert.equal(pn.contor.m15, 2, "moneda de 10 zile: 2 pagini");
  ceasN.now += 15 * 60000 + 1000; pn.contor.m15 = 0; const n2 = await cn.mcsAduCoin("NOU", { fara1D: true, vechi: n1.b15 }), ni = await cn.mcsAduCoin("NOU");
  assert.equal(J(n2.b15), J(ni.b15)); assert.equal(pn.contor.m15, 1 + 2);
});
await test("3d pagina botului într-o oră (socotește singură, colectorul tace): cel mult 13 cereri la Pionex (înainte 32), fără barele zilnice, cu barele aducerii întregi", async () => {
  const ceas = { now: T + 7 * 60000 }, pf = pionexFals(T - 40 * ZI, 3, ceas), ctx = ctxMcs(ceas, pf);
  Object.assign(ctx, { GridSim: GS, TextRo: globalThis.TextRo, mcsSimbolBot: () => "PONS", tbPanouVizibil: () => true, textEroare: (e) => String(e && e.message || e), TabloBot: { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) }, tbPlan: { botId: null, plan: null }, tbDeseneazaCitire: () => {} });
  const b0 = (await ctx.mcsAduCoin("PONS")).b15, Pn = b0[b0.length - 1].c; pf.contor.m15 = pf.contor.d1 = pf.contor.funding = 0;
  ctx.tbStare = { routeOk: true, bot: bot({ gridJos: Pn * 0.9, gridSus: Pn * 1.1, opritorPierdere: Pn * 0.85, pornitLa: b0[b0.length - 8].t }), citireO: null, funding: null };
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + "var tbMcKv={la:0,d:null,inLucru:null};\n" + ["tbMcWorkerAsteptare", "tbMcSimuleaza", "tbMcDinKv", "tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
  vm.runInContext(src, ctx);
  for (let k = 0; k < 4; k++) {
    if (k) ceas.now += 15 * 60000 + 1000;
    await ctx.tbMcTick(); for (let i = 0; i < 200 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 30));
    assert.ok(ctx.tbMc.rand && !ctx.tbMc.eroare, "socotirea " + k + ": " + (ctx.tbMc.eroare || ""));
  }
  const cereri = pf.contor.m15 + pf.contor.d1 + pf.contor.funding;
  console.log("       (pagina botului, o oră: " + cereri + " cereri la Pionex - 15M " + pf.contor.m15 + ", 1D " + pf.contor.d1 + ", funding " + pf.contor.funding + "; KV " + pf.contor.kv + ")");
  assert.equal(pf.contor.d1, 0, "barele zilnice nu se folosesc pe pagina botului"); assert.ok(cereri <= 13, cereri + " cereri într-o oră");
  const c = pf.contor.m15; const intreg = await ctx.mcsAduCoin("PONS"); pf.contor.m15 = c;
  assert.equal(J(ctx.tbMc.b15), J(intreg.b15), "barele socotirii = barele aducerii întregi de acum");
});

await test("3e mcsLipesteBare: legate ⇒ vechi până la prima nouă + noile, ultimele max; gaură ⇒ null; la aceeași oră bara nouă", () => {
  const ctx = ctxMcs({ now: T }, pionexFals(T - 40 * ZI, 3, { now: T })), b = (i, c) => ({ t: T + i * Q, o: 1, h: 1, l: 1, c: c || 1, v: 1 });
  const vechi = [0, 1, 2, 3, 4].map((i) => b(i)), noi = [3, 4, 5, 6].map((i) => b(i, 2));
  assert.equal(J(ctx.mcsLipesteBare(vechi, noi, 0)), J([b(0), b(1), b(2), b(3, 2), b(4, 2), b(5, 2), b(6, 2)]));
  assert.equal(J(ctx.mcsLipesteBare(vechi, noi, 5)), J([b(2), b(3, 2), b(4, 2), b(5, 2), b(6, 2)]), "ultimele max");
  assert.equal(J(ctx.mcsLipesteBare(vechi, [5, 6].map((i) => b(i, 2)), 0)), J([b(0), b(1), b(2), b(3), b(4), b(5, 2), b(6, 2)]), "imediat după ultima veche: legate");
  assert.equal(ctx.mcsLipesteBare(vechi, [6, 7].map((i) => b(i, 2)), 0), null, "o bară lipsă ⇒ gaură"); assert.equal(ctx.mcsLipesteBare([], noi, 0), null); assert.equal(ctx.mcsLipesteBare(vechi, [], 0), null);
});
await test("3f pagina botului: aducerea întreagă tăiată de o eroare nu se lipește (următoarea e întreagă); altă monedă ⇒ barele ei, aduse întregi", async () => {
  const ceas = { now: T + 7 * 60000 }, pf = pionexFals(T - 40 * ZI, 3, ceas), ctx = ctxMcs(ceas, pf);
  let simCerut = "PONS"; Object.assign(ctx, { GridSim: GS, TextRo: globalThis.TextRo, mcsSimbolBot: () => simCerut, tbPanouVizibil: () => true, textEroare: (e) => String(e && e.message || e), TabloBot: { simboluri: () => ({ pionex: simCerut + "_USDT_PERP" }) }, tbPlan: { botId: null, plan: null }, tbDeseneazaCitire: () => {} });
  const b0 = (await ctx.mcsAduCoin("PONS")).b15, Pn = b0[b0.length - 1].c;
  ctx.tbStare = { routeOk: true, bot: bot({ gridJos: Pn * 0.9, gridSus: Pn * 1.1, opritorPierdere: Pn * 0.85, pornitLa: null }), citireO: null, funding: null };
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + "var tbMcKv={la:0,d:null,inLucru:null};\n" + ["tbMcWorkerAsteptare", "tbMcSimuleaza", "tbMcDinKv", "tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
  vm.runInContext(src, ctx);
  const tic = async () => { await ctx.tbMcTick(); for (let i = 0; i < 200 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 30)); };
  let n15 = 0; pf.f.pica = (u) => /interval=15M/.test(u) && ++n15 === 3; pf.contor.m15 = 0; await tic(); pf.f.pica = null;
  assert.ok(ctx.tbMc.rand, ctx.tbMc.eroare); assert.equal(ctx.tbMc.b15Intreg, false); assert.equal(pf.contor.m15, 2, "două pagini date, a treia picată");
  ceas.now += 15 * 60000 + 1000; pf.contor.m15 = 0; await tic();
  assert.equal(pf.contor.m15, 6, "după o aducere incompletă, următoarea e întreagă"); assert.equal(ctx.tbMc.b15Intreg, true);
  const pa = pionexFals(T - 50 * ZI, 21, ceas), ctxA = ctxMcs(ceas, pa), getP = pf.getJSON;
  ctx.getJSON = async (u) => (/ALT_USDT_PERP/.test(u) ? pa.getJSON(u) : getP(u));
  simCerut = "ALT"; ctx.tbStare.bot = bot({ id: "77", baza: "ALT.PERP", simbolPionex: "ALT_USDT_PERP", gridJos: Pn * 0.9, gridSus: Pn * 1.1, opritorPierdere: Pn * 0.85, pornitLa: null });
  ceas.now += 60000; await tic();
  assert.equal(pa.contor.m15, 6, "altă monedă ⇒ aducerea întreagă a ei"); const iA = await ctxA.mcsAduCoin("ALT");
  assert.equal(J(ctx.tbMc.b15), J(iA.b15), "barele monedei noi, nu lipite de ale celei vechi");
});

// ───────────────────────── (4) fraza adevărată ─────────────────────────
const FRAZA = "șanse pe drumuri trase din ultima lună de prețuri, nu o predicție";
await test("4a „ultima lună” e adevărat: pagina aduce 6 pagini × 500 de bare de 15 minute, colectorul ține 3000 ⇒ 31,25 de zile", () => {
  const a = functie(MSE, "mcsAduCoin"); assert.match(a, /p < 6/); assert.match(a, /limit=500/);
  const l = functie(COL, "lumanari15M"); assert.match(l, /imbinaRanduri\(randuri, r, 3000\)/); assert.match(l, /st \? 1 : 6/);
  const zile = 6 * 500 * 15 / 1440; assert.ok(zile >= 28 && zile <= 32, zile);
});
await test("4b pagina botului și Discord spun fraza adevărată; „ultimele 14 zile” nu mai apare", async () => {
  const r = functie(APP, "tbMcRand"); assert.ok(r.includes('nota:"' + FRAZA + '"'), "nota din tbMcRand"); assert.doesNotMatch(r, /ultimele 14 zile/);
  assert.doesNotMatch(TMC, /ultimele 14 zile/);
  const st = { boti: {} }, trimise = [], d = depsTura({ stare: st, anunta: async (m) => { trimise.push(m); return true; } });
  await turaMonteCarloBot(d); const acum = st.boti["2408"].cat, altul = acum === "tine" ? "zgomot" : "tine";
  st.boti["2408"] = { cat: altul, text: "x", la: T - 3600000, ultima: T - 900000, candidat: acum, candidatN: 1 };
  await turaMonteCarloBot(d); assert.equal(trimise.length, 1); assert.ok(trimise[0].mesaj.endsWith(" · " + FRAZA), trimise[0].mesaj);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
