// Proba v100.216 (19.10.2026, el: „pe bara de grid să arate doar gridul și stop loss, nu și lichidarea, și să calculeze live
// stoploss dacă pun procent” - „în drumul botului”). Drumul botului (lib/asezare-paznic.js) arată gridul jos / sus, stopul și
// prețul de acum; planul, zero-ul, intrarea și lichidarea rămân pe grafic. Stopul pus în PROCENTE din investiție (Pionex
// lossStopType=profit_ratio) se socotește la prețul live, cu grilele de pe drum (TabloExtra.pretStopLive), nu doar pe poziția
// de acum (bot-orders.js pretDinRaport); aceeași cifră pe linia „stopul tău” a graficului.
// Rulare: node scripts/proba-v100216.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (...p) => fs.readFileSync(new URL("../" + p.join("/"), import.meta.url), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js"]) vm.runInThisContext(citeste("public", "lib", f));
const T = globalThis.TabloExtra;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
// un bot long 3× pe 0,40–0,50, la 0,46, cu poziția de acum și ordinele de cumpărare rămase până jos (row 21, perVolume 10)
const bot = (o) => ({ id: "7", baza: "ZRO.PERP", directie: "long", levier: 3, pretCurent: 0.46, gridJos: 0.40, gridSus: 0.50, profitNet: 1.2, pozitie: 60, pretDeschidere: 0.47,
  investit: 100, pretLichidare: 0.31, distantaLichidarePct: 32.6, opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.05, opritorPierdere: 0.4535,
  brut: { buOrderData: { row: 21, perVolume: 10 } }, ...o });

await test("stopul în procente: prețul la care totalul CU grilele de pe drum e exact −5% din investiție", () => {
  assert.equal(typeof T.pretStopLive, "function", "TabloExtra.pretStopLive");
  const b = bot(), x = T.pretStopLive(b);
  assert.ok(x > 0 && x < b.pretCurent, "sub preț la long: " + x);
  assert.ok(Math.abs(T.totalCuGridLa(b, x) - (-5)) < 1e-6, "totalul la stop = −5 USDT, nu " + T.totalCuGridLa(b, x));
  assert.ok(Math.abs(x - b.opritorPierdere) > 1e-4, "nu e prețul serverului socotit doar pe poziția de acum");
});
await test("live: prețul se mută cu prețul botului (poziția și grilele rămase se schimbă)", () => {
  const a = T.pretStopLive(bot()), c = T.pretStopLive(bot({ pretCurent: 0.44, pozitie: 80, profitNet: 1.0 }));
  assert.ok(a > 0 && c > 0 && Math.abs(a - c) > 1e-5, a + " vs " + c);
});
await test("stopul pus ca PREȚ rămâne prețul lui; stins ⇒ nimic; short oglindit", () => {
  assert.equal(T.pretStopLive(bot({ opritorPierdereTip: "pret", opritorPierdereRaport: null, opritorPierdere: 0.38 })), 0.38);
  assert.equal(T.pretStopLive(bot({ opritorPierdereActiv: false })), null);
  const s = bot({ directie: "short", pretDeschidere: 0.45, pozitie: -60, gridJos: 0.40, gridSus: 0.50 }), y = T.pretStopLive(s);
  assert.ok(y > s.pretCurent && Math.abs(T.totalCuGridLa(s, y) - (-5)) < 1e-6, "short: peste preț, −5 la stop: " + y);
});
await test("totalul deja sub procent (se declanșa acum) ⇒ prețul serverului, nu null", () => {
  assert.equal(T.pretStopLive(bot({ profitNet: -9 })), 0.4535);
});

// ---- drumul botului: doar gridul, stopul și prețul de acum ----
const AS = citeste("public", "lib", "asezare-paznic.js");
function incarcaAsezarea(extra) {
  const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: T, ...extra };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
  return ctx;
}
await test("nivelurile drumului: grid jos, grid sus, stop - fără lichidare, plan, zero, intrare", () => {
  // graficul a desenat deja cu TOATE nivelurile: drumul nu le mai ia de acolo
  const ctx = incarcaAsezarea({ tbGraficUltim: { botId: "7", niv: [{ k: "gridSus", p: 0.5 }, { k: "planPlus", p: 0.49 }, { k: "zero", p: 0.465 }, { k: "intrare", p: 0.47 }, { k: "planMinus", p: 0.43 }, { k: "gridJos", p: 0.4 }, { k: "stop", p: 0.4535 }, { k: "lich", p: 0.31 }], stopPlan: 0.42 } });
  const A = ctx.AsezarePaznic; assert.equal(typeof A.nivele, "function", "AsezarePaznic.nivele");
  const L = A.nivele(bot()), n = L.map((x) => x.n).join(" | ");
  assert.doesNotMatch(n, /lichidare|plan|zero|intrare/, n);
  assert.match(n, /grid jos/); assert.match(n, /grid sus/); assert.match(n, /stop/);
  assert.equal(L.length, 3, n);
  const st = L.find((x) => /stop/.test(x.n));
  assert.ok(Math.abs(st.p - T.pretStopLive(bot())) < 1e-12, "stopul drumului = cel socotit live: " + st.p);
  assert.match(st.n, /stop −5,0%/, "stopul în procente se spune: " + st.n);
});
await test("drumul ia prețul LIVE al botului (pvBotLive), nu cel de la ultima citire", () => {
  const ctx = incarcaAsezarea({ pvBotLive: (b) => ({ ...b, pretCurent: 0.44, pozitie: 80, profitNet: 1.0 }) });
  const L = ctx.AsezarePaznic.nivele(bot()), st = L.find((x) => /stop/.test(x.n));
  assert.ok(Math.abs(st.p - T.pretStopLive(bot({ pretCurent: 0.44, pozitie: 80, profitNet: 1.0 }))) < 1e-12, "stop la prețul live");
  const h = ctx.AsezarePaznic.drumHtml(bot(), false, 1100);
  assert.match(h, /acum 0[.,]44/, "„acum” = prețul live");
  assert.doesNotMatch(h, /lichidare/, "fără lichidare pe drum");
});
await test("fără stop: drumul are doar gridul (și „acum”)", () => {
  const ctx = incarcaAsezarea({});
  const L = ctx.AsezarePaznic.nivele(bot({ opritorPierdereActiv: false }));
  assert.equal(JSON.stringify(L.map((x) => x.n)), JSON.stringify(["grid jos", "grid sus"]));
});
await test("graficul: linia „stopul tău” folosește același preț live", () => {
  const G = citeste("public", "lib", "grafic-bot.js");
  assert.match(G, /stopLive: TE && TE\.pretStopLive \? TE\.pretStopLive\(b\) : null/, "intrareBot dă stopul live");
  assert.match(G, /ad\("stop", o\.stopLive != null \? o\.stopLive : b\.opritorPierdere, "stopul tău"/, "niveluriBot îl folosește");
});

console.log(`\n${teste - picate}/${teste} verzi`);
if (picate) process.exit(1);
