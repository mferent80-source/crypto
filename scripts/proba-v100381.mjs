// Proba v100.381 (el, 24.11.2026, pe poza botului BULLA long 3×: „cum poate să atingă și stopul și TP în proporție de 72% ambele?” ⇒ „da”
// pe reparația propusă): pe cartela „Marginea contra botului”, pe 24 h, stopul venea din curba stopului (a PIEȚEI, nu știe de take-profit:
// „prețul ajunge la nivelul stopului”), iar take-profit-ul din Monte Carlo pe botul lui (unde fiecare drum se oprește la ce vine ÎNTÂI) ⇒
// ~72% + 72,6%. Acum, când botul are take-profit cu cifra lui pe 24 h, ambele bare vin din ACEEAȘI simulare (împreună cel mult 100%), iar
// curba stopului rămâne scrisă dedesubt, ca reper, cu ce măsoară ea. Fără take-profit nu se schimbă nimic (îndreptarea 1 din v100.374).
// Rulare: node scripts/proba-v100381.mjs
import assert from "node:assert/strict";
import { cuTablou } from "./lib/sursa-app.mjs";
import fs from "node:fs";
import vm from "node:vm";
import "./lib/text-ro-global.mjs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const LIBF = (f) => citeste("../public/lib/" + f);

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
const CM = c.CapMargine;
const J = (x) => JSON.parse(JSON.stringify(x));

// botul LUI din poză (24.11.2026 ~09:00): BULLA long 3×, stopul 0.02251, take-profit +5% din investiție (+11,9 USDT), curba stopului ~72%,
// Monte Carlo pe 1 h / 4 h / 24 h: stopul 5,8% / 11,8% / (ascuns până acum), take-profit 16,0% / 36,2% / 72,6%. Cifra de 24 h a stopului
// din simulare nu era pe ecran; pun 21,3% (după simulare e cel mult 100 − 72,6 = 27,4%).
const BOT = { dir: "long", pret: 0.02426, jos: 0.022, sus: 0.0265, stop: 0.02251, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -49.6 : 5.0), laStop: -35.8, total: -1.8, sanse: {}, pas: 0.004,
  tp: 0.0299, laTp: 11.9, tpRaport: 0.05, tpDinPret: false, stopDrum: 0.72,
  stopScurt: [{ ore: 1, pStop: 0.058, pTp: 0.16 }, { ore: 4, pStop: 0.118, pTp: 0.362 }, { ore: 24, pStop: 0.213, pTp: 0.726 }] };
const A = (x) => CM.alcatuieste({ ...BOT, ...x });
const bara = (x, k) => J(CM.metri(A(x)).find((q) => q.k === k) || null);

console.log("\nV100.381 · stopul și take-profit-ul pe 24 h din aceeași simulare · proba\n");

console.log("A. cartela, cu take-profit");
await test("A1 botul din poză: pe 24 h stopul vine din Monte Carlo (21,3%), ca take-profit-ul (72,6%) - împreună cel mult 100%", () => {
  const s = bara({}, "stop"), t = bara({}, "tp");
  assert.deepEqual(s.bare, [{ et: "1 h", p: 0.058, text: "5,8%" }, { et: "4 h", p: 0.118, text: "11,8%" }, { et: "24 h", p: 0.213, text: "21,3%" }]);
  assert.deepEqual(t.bare.map((q) => q.text), ["16,0%", "36,2%", "72,6%"]);
  for (const o of ["1 h", "4 h", "24 h"]) assert.ok(s.bare.find((q) => q.et === o).p + t.bare.find((q) => q.et === o).p <= 1, "pe " + o + " stopul + take-profit-ul ≤ 100%");
});
await test("A2 sursa barei stopului spune că e „ce vine întâi” și păstrează curba stopului ca reper, cu ce măsoară ea (~72%)", () => {
  const s = bara({}, "stop").sursa;
  assert.match(s, /^Monte Carlo pe botul tău: ce vine întâi, stopul sau take-profit-ul/);
  assert.match(s, /prețul ajunge la nivelul stopului în 24 h: ~72% \(curba stopului, ca pe Drum\), dar take-profit-ul poate închide botul înainte/);
  assert.match(s, /pe 24 h simularea nu e încă verificată/);
  assert.equal(/24 h: curba stopului, ca pe Drum$/.test(s), false, "nu mai spune că bara de 24 h e curba");
});
await test("A3 cu take-profit, 1 h și 4 h nu mai sunt ascunse de curbă (toate trei din aceeași simulare)", () => {
  const s = bara({ stopDrum: 0.05 }, "stop");
  assert.deepEqual(s.bare.map((q) => q.et), ["1 h", "4 h", "24 h"]);
  assert.equal(s.bare[2].text, "21,3%");
});
await test("A4 propoziția stopului și blocul „Dacă muți gridul” spun la curbă că nu ține cont de take-profit", () => {
  const t = CM.textStop(A({}));
  assert.match(t, /în 24 h — 21,3% \(Monte Carlo pe botul tău, înaintea take-profit-ului\)/);
  assert.match(t, /prețul la nivelul stopului în 24 h — ~72% \(curba stopului, fără take-profit\)/);
  /* blocul „Dacă muți gridul acum”, pe botul HYPE din proba v100.374 (O1), cu un take-profit pus */
  const MUT = { dir: "long", pret: 56.333, jos: 60, sus: 66, stop: 54, stopActiv: true, laMargine: () => -7.49, laStop: -32.68, total: -22.77, sanse: {}, afaraOre: 3.4, stopDrum: 0.44,
    mut: { iei: 71.56, investit: 94.44, comInchidere: 0.118, levier: 3, pretZero: 62.1806, grile: 2.56, perechi: 107, oreInGrid: 14.1 } };
  const SC = [{ ore: 1, pStop: 0.02, pTp: 0.05 }, { ore: 4, pStop: 0.06, pTp: 0.2 }, { ore: 24, pStop: 0.17, pTp: 0.5 }];
  const cu = CM.textMut(CM.alcatuieste({ ...MUT, tp: 70, laTp: 4.7, tpRaport: 0.05, tpDinPret: false, stopScurt: SC })).randuri[1];
  assert.equal(cu, "Riști încă 9,9 USDT până la stop, pentru 15,3 USDT recuperați dacă prețul se întoarce la margine · stopul atins în 24 h, înaintea take-profit-ului: 17,0% (Monte Carlo pe botul tău) · prețul la nivelul stopului: ~44% (curba stopului, fără take-profit)");
  const fara = CM.textMut(CM.alcatuieste(MUT)).randuri[1];
  assert.equal(fara, "Riști încă 9,9 USDT până la stop, pentru 15,3 USDT recuperați dacă prețul se întoarce la margine · stopul atins în 24 h: ~44% (curba stopului)", "fără take-profit: ca în v100.374");
});

console.log("\nB. ce NU se schimbă");
await test("B1 fără take-profit: pe 24 h rămâne curba stopului (îndreptarea 1 din v100.374), cu textul de până acum", () => {
  const s = bara({ tp: null, laTp: null, tpRaport: null, tpDinPret: null }, "stop");
  /* v100.384 (I-933): și fără take-profit rândul stopului e al simulării pe toate trei orizonturile; curba stopului rămâne reperul numit al pieței */
  assert.deepEqual(s.bare, [{ et: "1 h", p: 0.058, text: "5,8%" }, { et: "4 h", p: 0.118, text: "11,8%" }, { et: "24 h", p: 0.213, text: "21,3%" }]);
  assert.match(s.sursa, /^Monte Carlo pe botul tău: botul iese pe stop · .+ · reper: prețul ajunge la nivelul stopului în 24 h: ~72% \(curba stopului, piața\)$/);
  assert.equal(CM.textStop(A({ tp: null })), "stopul atins: în 1 h — 5,8% · în 4 h — 11,8% · în 24 h — 21,3% (Monte Carlo pe botul tău) · reper: prețul la nivelul stopului în 24 h — ~72% (curba stopului, piața)");
});
await test("B2 simulare veche, fără cifra take-profit-ului pe 24 h: stopul rămâne pe curbă, take-profit-ul fără bara de 24 h", () => {
  const sc = [{ ore: 1, pStop: 0.058, pTp: 0.16 }, { ore: 4, pStop: 0.118, pTp: 0.362 }, { ore: 24, pStop: 0.213, pTp: null }];
  assert.equal(bara({ stopScurt: sc }, "stop").bare[2].text, "~72%");
  assert.deepEqual(bara({ stopScurt: sc }, "tp").bare.map((q) => q.et), ["1 h", "4 h"]);
});
await test("B3 fără stop: nicio bară a stopului, take-profit-ul rămâne", () => {
  const m = J(CM.metri(A({ stop: null, stopActiv: false, laStop: null })));
  assert.equal(m.some((q) => q.k === "stop"), false); assert.ok(m.some((q) => q.k === "tp"));
});

console.log("\nD. Drumul botului (stopul și take-profit-ul stau tot unul lângă altul)");
const APP = cuTablou(citeste("../public/app.js"));
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
function lumeBot() { const w = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, TextRo: globalThis.TextRo }); w.globalThis = w; w.window = w; for (const f of ["grid-calcul.js", "tablou-extra.js", "grafic-bot.js"]) vm.runInContext(LIBF(f), w, { filename: f }); return w; }
/* botul auditului din 14.10 (proba v100.196 / v100.376): long 5×, 100 USDT, grid 0,9–1,1, prețul 0,93; aici cu stop ca preț (0,88) și take-profit +3% */
function botDrum(G) {
  const N = 20, niv = G.niveluri(0.9, 1.1, N), cel = []; for (let k = 0; k < N; k++) cel.push({ k, q: 100 * 5 / N / niv[k], tine: false, intr: null });
  for (const x of cel) if (niv[x.k + 1] > 1.0) { x.tine = true; x.intr = 1.0; }
  for (const x of cel) if (!x.tine && niv[x.k] >= 0.93 && niv[x.k] < 1.0) { x.tine = true; x.intr = niv[x.k]; }
  const tin = cel.filter((x) => x.tine), q = tin.reduce((s, x) => s + x.q, 0), pd = tin.reduce((s, x) => s + x.q * x.intr, 0) / q;
  return { id: 7, directie: "long", investit: 100, levier: 5, pozitie: q, pretDeschidere: pd, pretCurent: 0.93, profitNet: -1, profitTotal: -1 + q * (0.93 - pd), gridJos: 0.9, gridSus: 1.1, distantaLichidarePct: 40,
    brut: { buOrderData: { row: N + 1, perVolume: 100 * 5 / N, gridType: "geometric" } }, opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdere: 0.88,
    opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.03, opritorProfit: 1.2 };
}
await test("D1 lângă take-profit, stopul de pe Drum ia cifra din aceeași simulare (21,3%, ca bara din cap); fără cifra take-profit-ului rămâne curba (~72%)", () => {
  const lume = lumeBot(), doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const st = { tp: "24 h: 72,6%", mc: "24 h: 21,3%" };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: lume.TabloExtra, TextRo: globalThis.TextRo,
    tbStopSansaDrum: () => "24 h: ~72%", tbTpSansaDrum: () => st.tp, tbStopMcDrum: () => st.mc };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(LIBF("asezare-paznic.js"), ctx);
  const b = botDrum(lume.GridCalcul), L = () => J(ctx.AsezarePaznic.nivele(b)), stopN = () => L().find((x) => /^stop/.test(x.n)), tpN = () => L().find((x) => /take-profit/.test(x.n));
  assert.equal(stopN().sansa, "24 h: 21,3%"); assert.equal(tpN().sansa, "24 h: 72,6%");
  st.tp = null; assert.equal(stopN().sansa, "24 h: 21,3%", "v100.384 (I-933): și fără cifra take-profit-ului, cifra simulării (ca în cap)");
  st.tp = "24 h: 72,6%"; st.mc = null; assert.equal(stopN().sansa, "24 h: ~72%", "simularea fără cifra stopului: curba");
  st.mc = "24 h: 21,3%"; delete ctx.tbStopMcDrum; assert.equal(stopN().sansa, "24 h: ~72%", "fără funcție (cadru vechi): curba, fără ReferenceError");
});
await test("D2 tbStopMcDrum: cifra stopului pe 24 h din simularea botului de pe ecran, doar când simularea are și cifra take-profit-ului; aceleași gărzi ca tbTpSansaDrum", () => {
  const mk = (tbMc) => { const c2 = vm.createContext({ tbMc, TextRo: globalThis.TextRo, isFinite, String, Array }); vm.runInContext(functie(APP, "tbStopMcDrum"), c2); return (b) => { c2.b = b; return vm.runInContext("tbStopMcDrum(b)", c2); }; };
  const SC = [{ ore: 1, pStop: 0.058, pTp: 0.16 }, { ore: 24, pStop: 0.213, pTp: 0.726 }];
  assert.equal(mk({ botId: "7", rand: { scurt: SC, text: "t" } })({ id: 7 }), "24 h: 21,3%");
  assert.equal(mk({ botId: "7", rand: { scurt: [{ ore: 24, pStop: 0.0002, pTp: 0.5 }] } })({ id: "7" }), "24 h: sub 0,1%");
  assert.equal(mk({ botId: "8", rand: { scurt: SC } })({ id: 7 }), null, "simularea altui bot"); assert.equal(mk({ botId: "7", eroare: "x", rand: { scurt: SC } })({ id: 7 }), null, "tura picată");
  assert.equal(mk({ botId: "7", rand: { scurt: SC, text: "«Reluarea arată botul OPRIT»" } })({ id: 7 }), null);
  assert.equal(mk({ botId: "7", rand: { scurt: [{ ore: 24, pStop: 0.1 }] } })({ id: 7 }), null, "simulare veche, fără pTp: nu se schimbă nimic");
});

console.log("\nE. „fa idei” (el, 24.11): Contează acum, verificarea pe 24 h, eticheta de pe Drum");
const CTX_C = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); CTX_C.globalThis = CTX_C; CTX_C.window = CTX_C;
vm.runInContext(LIBF("conteaza.js"), CTX_C, { filename: "conteaza.js" });
const CO = CTX_C.Conteaza, STOP_C = { p24: 0.7, p72: 0.86, stop: 0.02251, d: 2.1, perechi: 21, zile: 30 };
const randC = (s) => J(CO.alege({ stop: s, sfaturi: [], lista: [], sanse: [], acum: Date.UTC(2026, 10, 24, 9) })).find((q) => q.cheie === "stop");
await test("E1 Contează acum, botul cu take-profit: titlul spune că PREȚUL ajunge la stop (curba), dedesubt ce vine întâi după simulare; pragul și roșul rămân pe curbă", () => {
  const r = randC({ ...STOP_C, intai: { stop: 0.206, tp: 0.722 } });
  assert.equal(r.titlu, "Prețul ajunge la stopul tău (0.02251) într-o zi în ~70 din 100 de cazuri");
  assert.match(r.sub, /^cu take-profit-ul tău, botul iese întâi pe stop în ~21 din 100 și pe take-profit în ~72 din 100 \(simularea pe botul tău, pe 24 h\) · e la 2,1 ATR de preț/);
  assert.equal(r.ton, "rosu"); assert.equal(r.nr, "70");
  const a = J(CO.acasa([r], "BULLA")); assert.equal(a.titlu, "BULLA: prețul ajunge la stopul (0.02251) într-o zi în ~70 din 100 de cazuri");
  /* fără take-profit (sau fără cifrele simulării): exact ca până acum */
  const v = randC(STOP_C); assert.equal(v.titlu, "Stopul tău (0.02251) e atins într-o zi în ~70 din 100 de cazuri"); assert.match(v.sub, /^e la 2,1 ATR de preț/);
  assert.equal(randC({ ...STOP_C, intai: { stop: null, tp: 0.7 } }).titlu, v.titlu);
  assert.equal(J(CO.acasa([v], "BULLA")).titlu, "BULLA: stopul (0.02251) e atins într-o zi în ~70 din 100 de cazuri");
});
await test("E2 pagina dă Contează acum cifrele simulării doar la botul cu take-profit (tbStopCuIntai / tbMcIntai24), cu gărzile lui tbStopMcDrum", () => {
  assert.match(functie(APP, "tbConteazaLista"), /Conteaza\.alege\(\{stop:typeof tbStopCuIntai==="function"\?tbStopCuIntai\(b\):tbStopSansa\(b\),/, "cu garda typeof (probele vechi rulează funcția izolat)");
  const mk = (tbMc, sansa) => { const c2 = vm.createContext({ tbMc, tbStopSansa: () => sansa, TextRo: globalThis.TextRo, isFinite, String, Array, Object }); vm.runInContext(functie(APP, "tbMcIntai24") + functie(APP, "tbStopCuIntai"), c2); return (b) => { c2.b = b; return J(vm.runInContext("tbStopCuIntai(b)", c2)); }; };
  const SC = [{ ore: 1, pStop: 0.058, pTp: 0.16 }, { ore: 24, pStop: 0.206, pTp: 0.722 }], S = { p24: 0.7, stop: 0.02251 };
  assert.deepEqual(mk({ botId: "7", rand: { scurt: SC } }, S)({ id: 7, opritorProfitActiv: true }), { ...S, intai: { stop: 0.206, tp: 0.722 } });
  assert.deepEqual(mk({ botId: "7", rand: { scurt: SC } }, S)({ id: 7, opritorProfitActiv: false }), { ...S, intai: { stop: 0.206, tp: 0.722, faraTp: true } }, "v100.384 (I-933): și fără take-profit, cifra simulării (faraTp)");
  assert.deepEqual(mk({ botId: "8", rand: { scurt: SC } }, S)({ id: 7, opritorProfitActiv: true }), S, "simularea altui bot");
  assert.deepEqual(mk({ botId: "7", rand: { scurt: SC, text: "«Reluarea arată botul OPRIT»" } }, S)({ id: 7, opritorProfitActiv: true }), S);
  assert.deepEqual(mk({ botId: "7", rand: { scurt: [{ ore: 24, pStop: 0.2 }] } }, S)({ id: 7, opritorProfitActiv: true }), S, "simulare veche, fără pTp");
  assert.equal(mk({ botId: "7", rand: { scurt: SC } }, null)({ id: 7, opritorProfitActiv: true }), null, "fără curba stopului: nimic (ca până acum)");
});
await test("E3 sursa barei stopului: verificarea REALĂ a simulării pe 24 h pe boții lui (calibrareScurt), nu „nu e încă verificată”", () => {
  const V = (o) => [{ ore: 1, n: 365, zile: 24, pStopMed: 0.0135, stopRata: 0.0192, verdictStop: "potrivit", nTp: 27, zileTp: 2, verdictTp: "putine" }, { ore: 24, nTp: 2, zileTp: 2, verdictTp: "putine", ...o }];
  const s = bara({ tpVerif: V({ n: 47, zile: 24, pStopMed: 0.1877, stopRata: 0.1522, verdictStop: "nedecis" }) }, "stop").sursa;
  assert.match(s, /^Monte Carlo pe botul tău: ce vine întâi, stopul sau take-profit-ul \(împreună cel mult 100%\) · pe 24 h, pe boții tăi: stopul prezis 18,8%, atins 15,2% \(47 de judecate pe 24 de zile\) — încă nedecis · prețul ajunge/);
  assert.match(bara({ tpVerif: V({ n: 60, zile: 14, pStopMed: 0.2, stopRata: 0.21, verdictStop: "potrivit" }) }, "stop").sursa, / · pe 24 h, pe boții tăi: stopul prezis 20,0%, atins 21,0% \(60 de judecate pe 14 zile\) — se potrivește · /);
  assert.match(bara({ tpVerif: V({ n: 20, zile: 5, pStopMed: 0.2, stopRata: 0.1, verdictStop: "nedecis" }) }, "stop").sursa, / · pe 24 h, verificarea pe boții tăi strânge date \(20 de judecate pe 5 zile; trebuie 30 pe 10 zile\) · /);
  assert.match(bara({ tpVerif: V({ n: 0, zile: 0 }) }, "stop").sursa, / · pe 24 h simularea nu e încă verificată · /, "fără judecate: textul de până acum");
});
await test("E4 Drumul pe telefon: o etichetă lungă care centrată ar ieși din cartelă se lipește de margine (ca sub 12% / peste 88%); ancora(x) cu un argument rămâne la fel", () => {
  const lume = lumeBot(), doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 390, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: lume.TabloExtra, TextRo: globalThis.TextRo,
    tbStopSansaDrum: () => "24 h: ~72%" };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(LIBF("asezare-paznic.js"), ctx);
  const b = { ...botDrum(lume.GridCalcul), pretCurent: 0.97, opritorPierdere: 0.93, opritorProfitActiv: false };
  for (const W of [360, 384]) {
    const h = ctx.AsezarePaznic.drumHtml(b, false, W);
    /* fiecare etichetă: de la <span class="pzDrumEt" până la următorul <i (eticheta poate avea înăuntru <b> și <span class="pzDrumSansa">) */
    const I = h.split('<span class="pzDrumEt" ').slice(1).map((c) => /^style="left:([\d.]+)%;([^"]*?)top:(\d+)px[^"]*">([\s\S]*?)(?=<i |<\/div>|$)/.exec(c)).filter(Boolean).map((m) => {
      const l = m[1], st = m[2], txt = m[4].replace(/<[^>]+>/g, ""), cx = Number(l) * W / 100, w = txt.length * 6.3;
      const a = /translateX\(-6px\)/.test(st) ? cx - 6 : /calc\(-100% \+ 6px\)/.test(st) ? cx + 6 - w : cx - w / 2; return { txt, a, b: a + w }; });
    const s = I.find((x) => /^stop/.test(x.txt)); assert.ok(s, "eticheta stopului lipsește la " + W + ": " + (h.match(/<span class="pzDrumEt"[^>]*>[^<]*/g) || []).join(" | ").slice(0, 400));
    for (const x of I) assert.ok(x.a >= -2 && x.b <= W + 2, `la ${W}: „${x.txt}” iese din cartelă: ${x.a.toFixed(0)}–${x.b.toFixed(0)}`);
  }
  assert.equal(ctx.AsezarePaznic.ancora(5), "transform:translateX(-6px);"); assert.equal(ctx.AsezarePaznic.ancora(95), "transform:translateX(calc(-100% + 6px));"); assert.equal(ctx.AsezarePaznic.ancora(50), "");
});

console.log("\nF. „rezolvă tot” (el, 24.11): stopul propus, lista de boți, „Boți activi”");
await test("F1 Contează acum, stopul propus care pierde MAI MULT decât al lui: banii la ambele variante și aceeași concluzie ca a Consilierului („l-aș lăsa unde e”); fără „~−”", () => {
  /* botul LUI de la 11:15: BULLA long 3×, stop −15% (−35,8 USDT), propunerea cartelei la 0.01581 = −94,2% din investiție (−224,9 USDT), acolo ~16 din 100 */
  const S = { p24: 0.76, p72: 0.85, stop: 0.02243, d: 0.9, perechi: 21, zile: 30, raport: -0.15, mut20: 0.01581, mutRaport: -0.942, mutP24: 0.16, mutTotal: -224.9, laStop: -35.8 };
  const r = randC(S);
  assert.equal(r.faCe, "Hotărăște acum: ori accepți ieșirea la −15,0% (−35,8 USDT), ori muți stopul la −94,2% din investiție (acum pe la ~0.01581; acolo ~16 din 100 într-o zi). Eu l-aș lăsa unde e: mutarea scade șansa de la ~76 la ~16 din 100 într-o zi, dar pierderea maximă crește de la 35,8 la 224,9 USDT.");
  assert.equal(/~[−+-]/.test(r.faCe), false, "fără „~” lipit de un procent cu semn");
  /* stopul pe preț: la fel, cu totalul de acolo */
  const P = randC({ ...S, raport: null, mutRaport: null, stop: 0.02243 });
  assert.match(P.faCe, /^Hotărăște acum: ori accepți ieșirea la 0\.02243 \(−35,8 USDT\), ori muți stopul la ~0\.01581 \(acolo ~16 din 100 într-o zi, totalul acolo ≈ −224,9 USDT\)\. Eu l-aș lăsa unde e: /);
  /* propunerea pierde MAI PUȚIN (grilele de pe drum o acoperă): nicio concluzie adăugată, ca până acum */
  const M = randC({ ...S, mutTotal: -20, laStop: -35.8 });
  assert.equal(M.faCe, "Hotărăște acum: ori accepți ieșirea la −15,0%, ori muți stopul la −94,2% din investiție (acum pe la ~0.01581; acolo ~16 din 100 într-o zi).");
  /* fără banii stopului de acum (pagina veche / lipsă): ca până acum, doar fără „~−” */
  assert.equal(randC({ ...S, laStop: null }).faCe, "Hotărăște acum: ori accepți ieșirea la −15,0%, ori muți stopul la −94,2% din investiție (acum pe la ~0.01581; acolo ~16 din 100 într-o zi).");
});
await test("F2 TabloExtra.stopPropus pune și banii stopului de acum (laStop = totalLaOpritor), ca rândul să poată compara ca Consilierul", () => {
  const TEs = citeste("../public/lib/tablou-extra.js");
  assert.match(TEs, /s\.laStop = laSt;/, "stopPropus: s.laStop");
  const lume = lumeBot(), TE = lume.TabloExtra, b = { ...botDrum(lume.GridCalcul), opritorPierdere: 0.85 };
  const s = TE.stopPropus(b, { mut20: 0.8, sus: false, pret: 0.93 }), laSt = TE.totalLaOpritor(b);
  assert.ok(laSt !== null && laSt < 0, "totalLaOpritor: " + laSt); assert.equal(s.laStop, laSt);
});
await test("F3 lista de boți din Tablou: botul de SEMNAL care rulează nu mai e „(oprit)” (activ = grid pornit, intenționat din v100.380)", () => {
  const f = functie(APP, "tbDeseneazaSelectorul");
  const sel = { hidden: true, innerHTML: "" }, c2 = vm.createContext({ $: () => sel, escapeHtml: (x) => String(x), tbStare: { bot: { id: "2661" }, boti: [
    { id: "2661", simbol: "BULLA.PERP/USDT", activ: true }, { id: "2660", simbol: "BTC/USDT", tip: "semnal", activ: false, ruleaza: true },
    { id: "2659", simbol: "ETH/USDT", tip: "semnal", activ: false, ruleaza: false }, { id: "2658", simbol: "SOL/USDT", activ: false }] } });
  vm.runInContext(f + "; tbDeseneazaSelectorul();", c2);
  const opt = [...sel.innerHTML.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
  assert.deepEqual(opt, ["BULLA.PERP/USDT", "BTC/USDT · bot de semnal", "ETH/USDT · bot de semnal (oprit)", "SOL/USDT (oprit)"]);
  assert.equal(sel.hidden, false);
});
await test("F4 Contul Pionex, „Boți activi”: gridul ca până acum, iar boții de semnal se spun separat („1 / 1 · 1 bot de semnal”, nu „1 / 2”)", () => {
  assert.match(APP, /if\(\$\('botiNumar'\)\)\$\('botiNumar'\)\.textContent=botiNumarText\(s,bots\);/);
  const c2 = vm.createContext({ TextRo: globalThis.TextRo }); vm.runInContext(functie(APP, "botiNumarText"), c2);
  const T = (s, b) => vm.runInContext("botiNumarText(" + JSON.stringify(s) + "," + JSON.stringify(b) + ")", c2);
  assert.equal(T({ numar: 2, active: 1, semnale: 1 }, [{ tip: "grid" }, { tip: "semnal", ruleaza: true }]), "1 / 1 · 1 bot de semnal");
  assert.equal(T({ numar: 3, active: 1, semnale: 1 }, [{}, { tip: "semnal", ruleaza: true }, { tip: "semnal", ruleaza: false }]), "1 / 1 · 2 boți de semnal (1 pornit)");
  assert.equal(T({ numar: 2, active: 2, semnale: 0 }, [{}, {}]), "2 / 2", "fără boți de semnal: ca până acum");
  assert.equal(T({}, [{}, {}]), "— / 2");
});

console.log("\nC. versiunea");
await test("v100.381 e pusă peste tot (colectorul neatins, v101.211), proba e în lanț după v100.380", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.382: „de la 381 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.382) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 381, "package.json"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 381); assert.ok(bi.li381 && bi.li381.length > 200, "BUILD_INFO.li381");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 381).length >= 4, true, "index.html: v100.381 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 381, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 381, "versiune.js");
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("./colector.mjs")) || [])[1] >= 211, "colectorul de la v101.211 încolo");   /* v100.383: colectorul merge mai departe */
  assert.match(pk.scripts.test, /npm run test:v100380 && npm run test:v100381/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100381"], "node scripts/proba-v100381.mjs");
});

console.log(`\n${teste - picate} / ${teste} teste trec.\n`);
process.exit(picate ? 1 : 0);
