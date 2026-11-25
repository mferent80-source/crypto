// Proba v100.374 (21.11.2026, el: „da fa tot” pe livrarea propusă după analiza de trader din 20.11):
//   cele două îndreptări găsite pe viu (stopul în 24 h cu două cifre pe același ecran; paza de vechime a șanselor, pe orizont),
//   I-903 rândul expunerii, I-897 stopul față de margine în bani, I-904 „fără stop” cu dovada lui, I-902 o singură cifră pentru margine,
//   I-905 „Vremea” într-un rând, I-898 drumul botului în arhivă, I-908 proba marginii (pre-înregistrată).
//   node scripts/proba-v100374.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.374 · Tabloul botului: expunerea, stopul față de margine, „fără stop”, o singură cifră, Vremea, drumul botului, proba marginii · proba\n");
function module_(...f) {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo });
  c.globalThis = c; c.window = c;
  for (const x of f) vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", x), "utf8"), c, { filename: x });
  return c;
}
const curat = (x) => JSON.parse(JSON.stringify(x));
const ORA = 3600000, T0 = Date.UTC(2026, 0, 1);
/* un bot închis, în forma rutei botiInchisi */
const bot = (o) => ({ strategyId: String(o.id || 1), buOrderType: "futures_grid", base: "X.PERP", createTime: o.creat || T0, closeTime: (o.creat || T0) + (o.min || 30) * 60000,
  buOrderData: { totalRealizedProfit: o.real ?? 0, gridProfit: o.grid ?? 0, totalFee: o.fee ?? 0, totalFundingFee: o.fund ?? 0, usdtInvestment: o.inv ?? 100, quoteInvestment: o.inv ?? 100, leverage: 3,
    trend: o.dir || "long", bottom: o.jos ?? 90, top: o.sus ?? 110, row: o.row ?? 21, gridType: o.tip || "geometric", closedPrice: o.pi ?? 100, lossStop: o.stop ?? null } });
const f = (p, scurt) => ({ p, scurt: scurt || Math.round(p * 100) + "%" });
/* botul lui din 20.11 seara (HYPE long 3×, grid 60–66, stop 56), cu prețul în grid */
const BAZA = { dir: "long", pret: 60.567, jos: 60, sus: 66, stop: 56, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -8.1 : 3.6), laStop: -24.9, total: -4.4,
  sanse: { jos: { 1: f(0.29), 4: f(0.55), 24: f(0.66) } }, sansePret: 60.567, sanseOra: "22:52" };

// ---------- A. îndreptarea 1: stopul în 24 h are o singură cifră pe ecran ----------
await test("A1 stopul atins: 1 h și 4 h din Monte Carlo, 24 h = cifra de pe Drum (curba stopului), scrisă ca acolo", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const k = c.CapMargine.alcatuieste({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.003 }, { ore: 4, pStop: 0.048 }, { ore: 24, pStop: 0.314 }], stopDrum: 0.42 });
  /* v100.384 (I-933): și fără take-profit rândul stopului e al simulării pe toate trei orizonturile; curba stopului rămâne reperul numit al pieței */
  assert.equal(c.CapMargine.textStop(k), "stopul atins: în 1 h — 0,3% · în 4 h — 4,8% · în 24 h — 31,4% (Monte Carlo pe botul tău) · reper: prețul la nivelul stopului în 24 h — ~42% (curba stopului, piața)");
  assert.doesNotMatch(c.CapMargine.textStop(k), /ca pe Drum/, "o singură cifră pentru „botul iese pe stop”: Drumul ia și el cifra simulării");
});
await test("A2 stopul atins: fără cifra de pe Drum rămâne Monte Carlo și la 24 h; „0,0%” nu se scrie - „sub 0,1%”", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const k = c.CapMargine.alcatuieste({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.0002 }, { ore: 4, pStop: 0.005 }, { ore: 24, pStop: 0.097 }] });
  assert.equal(c.CapMargine.textStop(k), "stopul atins: în 1 h — sub 0,1% · în 4 h — 0,5% · în 24 h — 9,7% (Monte Carlo pe botul tău)");
  const d = c.CapMargine.alcatuieste({ ...BAZA, stopDrum: 0.004 });
  assert.equal(c.CapMargine.textStop(d), "stopul atins: în 24 h — < 1% (curba stopului, ca pe Drum)", "doar cifra Drumului, scrisă ca pe Drum");
  assert.equal(c.CapMargine.textStop(c.CapMargine.alcatuieste({ ...BAZA, stop: null, stopActiv: false, laStop: null, stopDrum: 0.4 })), "", "fără stop nu se scrie nicio șansă a lui");
});
await test("A3 stopul atins: o cifră Monte Carlo pe 1 h / 4 h mai mare decât cea de 24 h de pe Drum nu se arată (s-ar contrazice pe același rând)", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const k = c.CapMargine.alcatuieste({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.02 }, { ore: 4, pStop: 0.3 }], stopDrum: 0.23 });
  assert.equal(c.CapMargine.textStop(k), "stopul atins: în 1 h — 2,0% (Monte Carlo pe botul tău) · în 24 h — ~23% (curba stopului, ca pe Drum)");
});

// ---------- B. îndreptarea 2: paza de vechime a șanselor, pe orizont ----------
await test("B1 o abatere mică a distanței nu mai ascunde toate cifrele: rămân cele care s-ar muta puțin, se spun „se refac” doar cele mutate mult", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  /* socotit la 1,3% de margine, acum la 1,6%: pe 1 h cifra mică se mută cu peste un sfert din ea; pe 24 h, cu câteva puncte */
  const x = { ...BAZA, pret: 60.975, sansePret: 60.79, sanse: { jos: { 1: f(0.12), 4: f(0.55), 24: f(0.72) } } };
  const k = c.CapMargine.alcatuieste(x), t = c.CapMargine.textSanse(k);
  assert.deepEqual(curat(k.sanse.map((s) => [s.ore, !!s.vechi])), [[1, true], [4, false], [24, false]]);
  assert.equal(t, "o atinge: în 4 h — 55 din 100 · în 24 h — 72 din 100 (istoria monedei, socotit la 22:52; amănuntele în Probabilități) · în 1 h se reface: era 12 din 100 cu marginea la 1,3%, acum e la 1,6%");
  assert.equal(k.sanseVechi, null, "nu toate sunt depășite");
});
await test("B2 când toate cifrele s-ar muta mult, rândul spune ca înainte că se refac (mai des / mai rar)", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const x = (pret) => ({ ...BAZA, pret, sansePret: 60.852, sanseOra: "19:44", sanse: { jos: { 1: f(0.07), 4: f(0.34), 24: f(0.72) } } });
  assert.match(c.CapMargine.textSanse(c.CapMargine.alcatuieste(x(60.12))), /^o atinge mai des decât arătau cifrele socotite cu marginea la 1,4% \(în 1 h — 7 din 100 · în 4 h — 34 din 100 · în 24 h — 72 din 100\): acum e la 0,2%; se refac în cel mult 10 minute$/);
  assert.match(c.CapMargine.textSanse(c.CapMargine.alcatuieste(x(62.5))), /^o atinge mai rar decât/);
  assert.doesNotMatch(c.CapMargine.textSanse(c.CapMargine.alcatuieste(x(60.9))), /se refac/, "aproape aceeași distanță: toate rămân");
});
await test("B3 cât s-ar muta o cifră: mersul aleator cu barieră (2·Φ(−z)), folosit doar ca pază - mai aproape ⇒ mai des, mai departe ⇒ mai rar, aceeași distanță ⇒ aceeași cifră", () => {
  const c = module_("text-ro.js", "cap-margine.js"), m = c.CapMargine.sansaMutata;
  assert.ok(Math.abs(m(0.29, 0.0094, 0.0094) - 0.29) < 1e-6);
  assert.ok(m(0.29, 0.0094, 0.014) < 0.15 && m(0.29, 0.0094, 0.014) > 0.08, "29 din 100 la 0,94% ⇒ ~11 din 100 la 1,4% (măsurat pe 20.11: 7)");
  assert.ok(m(0.28, 0.005, 0.015) < 0.01, "28 din 100 la 0,5% ⇒ sub 1 din 100 la 1,5% (măsurat: 1)");
  assert.ok(m(0.66, 0.013, 0.016) > 0.55 && m(0.66, 0.013, 0.016) < 0.66);
  assert.equal(m(0.5, 0, 0.01), null); assert.equal(m(null, 0.01, 0.01), null);
});
await test("B4 (revizia) cifrele de la capete - „0 din n” și „n din n” - sunt și ele prinse de pază când distanța s-a schimbat mult", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  /* socotit la 5,0% de margine, prețul ajuns la 0,2%: „sub 3 din 100 într-o oră” nu mai e arătat ca valabil */
  const k = c.CapMargine.alcatuieste({ ...BAZA, pret: 60.12, sansePret: 63.158, sanse: { jos: { 1: f(0, "sub 3%"), 4: f(0.02), 24: f(0.21) } } });
  assert.deepEqual(curat(k.sanse.map((q) => !!q.vechi)), [true, true, true]); assert.match(c.CapMargine.textSanse(k), /^o atinge mai des decât arătau cifrele socotite cu marginea la 5,0% \(în 1 h — sub 3 din 100/);
  /* invers: „peste 99 din 100” socotit lipit de margine, prețul plecat la 5% */
  const d = c.CapMargine.alcatuieste({ ...BAZA, pret: 63.158, sansePret: 60.03, sanse: { jos: { 1: f(1), 4: f(1), 24: f(1) } } });
  assert.match(c.CapMargine.textSanse(d), /^o atinge mai rar decât/);
  assert.doesNotMatch(c.CapMargine.textSanse(c.CapMargine.alcatuieste({ ...BAZA, sanse: { jos: { 1: f(0, "sub 3%"), 4: f(1) } } })), /se refac/, "aceeași distanță: și capetele rămân");
});

// ---------- C. I-903: rândul expunerii ----------
await test("C1 expunerea: poziția în USDT, levierul efectiv și cât costă 1% contra, în USDT și în ore de grile la ritmul botului", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const k = c.CapMargine.alcatuieste({ ...BAZA, expunere: { pozitie: 4.157, investit: 94.44, grile: 1.33, perechi: 55, varstaOre: 6.3 } });
  assert.ok(Math.abs(k.expunere.notional - 4.157 * 60.567) < 1e-9); assert.ok(Math.abs(k.expunere.levier - 4.157 * 60.567 / 94.44) < 1e-9);
  assert.equal(c.CapMargine.textExpunere(k), "Poziția: 251,8 USDT long (levier efectiv 2,7×) · 1% contra = −2,5 USDT = 12 ore de grile la ritmul de până acum");
});
await test("C2 expunerea: fără ritm măsurat (puține perechi, bot de câteva minute) doar primele două; afară din grid nu se socotesc ore de grile", () => {
  const c = module_("text-ro.js", "cap-margine.js"), e = (o) => c.CapMargine.textExpunere(c.CapMargine.alcatuieste({ ...BAZA, ...o }));
  assert.equal(e({ expunere: { pozitie: 4.157, investit: 94.44, grile: 0.05, perechi: 2, varstaOre: 6 } }), "Poziția: 251,8 USDT long (levier efectiv 2,7×) · 1% contra = −2,5 USDT");
  assert.equal(e({ expunere: { pozitie: 4.157, investit: 94.44, grile: 1.33, perechi: 55, varstaOre: 0.2 } }), "Poziția: 251,8 USDT long (levier efectiv 2,7×) · 1% contra = −2,5 USDT");
  assert.equal(e({ pret: 56.933, stop: 54, laStop: -32.7, total: -20.2, expunere: { pozitie: 4.2, investit: 94.44, grile: 2.56, perechi: 107, varstaOre: 16 } }),
    "Poziția: 239,1 USDT long (levier efectiv 2,5×) · 1% contra = −2,4 USDT · afară din grid nu se mai fac grile");
  assert.equal(e({ expunere: { pozitie: 0, investit: 94.44 } }), "", "fără poziție nu se scrie nimic"); assert.equal(e({}), "");
  assert.match(e({ expunere: { pozitie: 4.157, investit: 94.44, grile: 0.0004, perechi: 6, varstaOre: 30 } }), /= peste 30 de zile de grile la ritmul de până acum$/, "(revizia) nu „7.868 de zile”");
  assert.match(e({ expunere: { pozitie: -3.1, investit: 100, grile: 6, perechi: 40, varstaOre: 2 }, dir: "short", pret: 65, stop: 70, laMargine: -5, laStop: -20 }), /^Poziția: 201,5 USDT short \(levier efectiv 2,0×\) · 1% contra = −2,0 USDT = 40 de minute de grile la ritmul de până acum$/);
});
await test("C3 expunerea la botul neutru: partea vine din semnul poziției și se spune că se schimbă cu prețul", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const t = c.CapMargine.textExpunere(c.CapMargine.alcatuieste({ dir: "neutral", pret: 100, jos: 95, sus: 106, expunere: { pozitie: -1.2, investit: 100 }, sanse: {} }));
  assert.equal(t, "Poziția: 120,0 USDT short acum (bot neutru: partea se schimbă cu prețul; levier efectiv 1,2×) · 1% contra = −1,2 USDT");
  assert.match(c.CapMargine.textExpunere(c.CapMargine.alcatuieste({ dir: "neutral", pret: 100, jos: 95, sus: 106, expunere: { pozitie: 0.8, investit: 100 }, sanse: {} })), /^Poziția: 80,0 USDT long acum \(bot neutru/, "poziția pe plus = long");
});

// ---------- D. I-897: stopul față de margine, în bani ----------
await test("D1 între margine și stop: cât mai pierde și cât de departe e stopul de margine; butonul de copiat poartă prețul marginii", () => {
  const c = module_("text-ro.js", "cap-margine.js"), k = c.CapMargine.alcatuieste(BAZA);
  assert.equal(c.CapMargine.textIntre(k), "între margine și stopul tău mai pierzi 16,8 USDT (stopul e cu 6,7% sub margine)");
  assert.deepEqual(curat(k.copiaza), [{ ce: "marginea de jos", pret: "60.0000", exact: "60" }]);
  assert.equal(c.CapMargine.alcatuieste({ ...BAZA, pret: 0.1251, jos: 0.123456, sus: 0.14, stop: null, stopActiv: false, laStop: null, sansePret: 0.1251 }).copiaza[0].exact, "0.123456", "(revizia) se copiază prețul întreg al marginii, nu cel rotunjit");
  const s = c.CapMargine.alcatuieste({ dir: "short", pret: 65, jos: 60, sus: 66, stop: 69.3, stopActiv: true, laMargine: -4, laStop: -19.5, sanse: {} });
  assert.equal(c.CapMargine.textIntre(s), "între margine și stopul tău mai pierzi 15,5 USDT (stopul e cu 5,0% peste margine)");
});
await test("D2 afară din grid: de aici până la stop; stopul din grid (înaintea marginii) sau lipsa lui nu scriu rândul", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  const a = c.CapMargine.alcatuieste({ ...BAZA, pret: 56.933, stop: 54, laStop: -32.7, total: -20.2 });
  assert.equal(c.CapMargine.textIntre(a), "de aici până la stopul tău mai pierzi 12,5 USDT (stopul e la 5,2% sub preț)"); assert.equal(a.copiaza, null, "afară din grid marginea nu se mai copiază");
  assert.equal(c.CapMargine.textIntre(c.CapMargine.alcatuieste({ ...BAZA, stop: 60.2, laStop: -6 })), "", "stopul e în grid: vine înaintea marginii");
  assert.equal(c.CapMargine.textIntre(c.CapMargine.alcatuieste({ ...BAZA, stop: 60.2, laStop: -9 })), "", "stopul din grid nu scrie rândul nici când totalul lui iese sub cel de la margine");
  assert.equal(c.CapMargine.textIntre(c.CapMargine.alcatuieste({ ...BAZA, stop: null, stopActiv: false, laStop: null })), "");
  assert.equal(c.CapMargine.textIntre(c.CapMargine.alcatuieste({ ...BAZA, pret: 56.933, stop: 54, laStop: -32.7, total: null })), "", "fără totalul de acum nu se socotește");
});

// ---------- E. I-904: „fără stop”, cu dovada de pe boții lui ----------
const BOTI_STOP = () => {
  const B = [];
  /* 40 fără stop: 6 închiși dincolo de margine (−60 fiecare, unul −200), 34 în grid (+2); 50 cu stop: 5 dincolo (−20), 45 în grid (+1) */
  for (let i = 0; i < 40; i++) B.push(bot({ id: i, real: i === 0 ? -200 : i < 6 ? -60 : 2, pi: i < 6 ? 85 : 100, min: i < 3 ? 3000 : 40, creat: T0 + i * 864e5 }));
  for (let i = 0; i < 50; i++) B.push(bot({ id: 100 + i, real: i < 5 ? -20 : 1, pi: i < 5 ? 88 : 100, stop: 87, min: 40, creat: T0 + i * 864e5 }));
  return B;
};
await test("E1 boții fără stop: câți, cei închiși dincolo de margine (netul și cea mai mare pierdere) față de ceilalți; cei cu stop, la fel", () => {
  const c = module_("text-ro.js", "cap-margine.js"), d = curat(c.CapMargine.dinBoti(BOTI_STOP()));
  assert.equal(d.stop.fara.n, 40); assert.equal(d.stop.fara.afara.n, 6); assert.equal(d.stop.fara.afara.net, -500); assert.equal(d.stop.fara.afara.max, -200); assert.equal(d.stop.fara.rest.n, 34); assert.equal(d.stop.fara.rest.net, 68);
  assert.equal(d.stop.cu.n, 50); assert.equal(d.stop.cu.afara.n, 5); assert.equal(d.stop.cu.afara.net, -100); assert.equal(d.stop.cu.afara.max, -20);
  assert.equal(c.CapMargine.textFaraStop(c.CapMargine.dinBoti(BOTI_STOP())),
    "Pe boții tăi fără stop (40 de boți): cei 6 închiși cu prețul trecut de margine au făcut −500,0 USDT (cea mai mare pierdere: −200,0 USDT); ceilalți 34: +68,0 USDT. La cei cu stop, cea mai mare pierdere dincolo de margine: −20,0 USDT. Așa au ieșit, nu ce urmează.");
  assert.equal(c.CapMargine.textFaraStop(c.CapMargine.dinBoti(BOTI_STOP().slice(0, 20))), "", "sub 30 de boți fără stop nu se spune nimic");
  const plus = []; for (let i = 0; i < 40; i++) plus.push(bot({ id: i, real: 2, pi: i < 6 ? 85 : 100 }));
  assert.doesNotMatch(c.CapMargine.textFaraStop(c.CapMargine.dinBoti(plus)), /cea mai mare pierdere/, "(revizia) niciunul n-a pierdut: nu se scrie „cea mai mare pierdere: 0,0”");
});
await test("E2 capul: botul fără stop își poartă dovada; cel cu stop (și în procente) nu", () => {
  const c = module_("text-ro.js", "cap-margine.js"), d = c.CapMargine.dinBoti(BOTI_STOP());
  const fara = c.CapMargine.alcatuieste({ ...BAZA, stop: null, stopActiv: false, laStop: null, dovada: d });
  assert.match(fara.faraStop, /^Pe boții tăi fără stop \(40 de boți\)/); assert.match(c.CapMargine.textBani(fara), /fără stop pus/);
  assert.equal(c.CapMargine.alcatuieste({ ...BAZA, dovada: d }).faraStop, "");
  assert.equal(c.CapMargine.alcatuieste({ ...BAZA, stop: null, stopActiv: true, stopEticheta: "stop −5%", laStop: null, dovada: d }).faraStop, "", "stopul în procente e stop");
});
const CONS = () => module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "consiliu.js");
const SM0 = { nivel: "tine", cod: "tine", motiv: "piața e liniștită", faCe: "L-aș lăsa să lucreze.", componente: [] };
const CARTELA = (tag) => [{ cod: "stop", tag: { t: tag, c: tag === "pus" ? "good" : "bad" }, act: "Prețul a trecut de marginea gridului: stopul s-ar pune sub prețul de acum (56.9330), nu la margine.", deCe: "Pe minus, din preț botul nu mai ajunge pe zero în grid: protecția doar limitează pierderea." }];
await test("E3 Consilierul: fără stop + afară din grid contra botului + pe minus ⇒ roșu, cu acțiunea „pun stop sau închid” și dovada; altfel rămâne galben", () => {
  const c = CONS(), dov = "Pe boții tăi fără stop (371 de boți): cei 33 închiși cu prețul trecut de margine au făcut −3.342,0 USDT.";
  const r = c.Consiliu.alcatuieste({ sm: SM0, concret: CARTELA("fără protecție"), sfaturi: [], afaraContra: true, total: -20.2, dovadaFaraStop: dov });
  assert.equal(r.nivel, "iesi"); assert.equal(r.motive[0].cod, "stop"); assert.equal(r.motive[0].titlu, "Botul e afară din grid, pe minus și fără stop");
  assert.match(r.faCe, /^Aș pune acum un stop sub prețul de acum sau aș închide botul/); assert.match(JSON.stringify(r.motive[0]), /cei 33 închiși cu prețul trecut de margine/);
  for (const [et, o] of [["în grid", { afaraContra: false, total: -20.2 }], ["pe plus", { afaraContra: true, total: 3 }], ["fără total", { afaraContra: true, total: null }]]) {
    const g = c.Consiliu.alcatuieste({ sm: SM0, concret: CARTELA("fără protecție"), sfaturi: [], dovadaFaraStop: dov, ...o });
    assert.equal(g.nivel, "atentie", et); assert.equal(g.motive[0].titlu, "Botul n-are stop activ în Pionex", et);
  }
  assert.equal(c.Consiliu.alcatuieste({ sm: SM0, concret: CARTELA("pus"), sfaturi: [], afaraContra: true, total: -20.2 }).nivel, "tine", "cu stop pus regula nu se aplică");
  /* (revizia 🔴) eticheta „bad” o are și botul CU stop dincolo de lichidare: rămâne galben, cu acțiunea cartelei lui */
  const nuApuca = c.Consiliu.alcatuieste({ sm: SM0, concret: [{ cod: "stop", tag: { t: "stopul nu apucă: lichidarea vine întâi", c: "bad" }, act: "Aș muta stopul înaintea lichidării (52.1000).", deCe: "…" }], sfaturi: [], afaraContra: "jos", total: -20, dovadaFaraStop: dov });
  assert.equal(nuApuca.nivel, "atentie"); assert.equal(nuApuca.faCe, "Aș muta stopul înaintea lichidării (52.1000)."); assert.doesNotMatch(JSON.stringify(nuApuca.motive), /fără stop \(371|Afară din grid|afară din grid, pe minus/);
  /* (revizia 🟡) cu componenta „plan” în semafor, motivul roșu intră tot */
  const smPlan = { nivel: "atentie", cod: "plan", motiv: "planul tău: în afara gridului peste pragul de ore", faCe: "Aș închide botul, cum scrie planul.", componente: [{ nivel: "atentie", cod: "plan", motiv: "planul tău: în afara gridului peste pragul de ore", faCe: "Aș închide botul, cum scrie planul." }] };
  const cuPlan = c.Consiliu.alcatuieste({ sm: smPlan, concret: CARTELA("fără protecție"), sfaturi: [], afaraContra: "jos", total: -20, dovadaFaraStop: dov });
  assert.equal(cuPlan.nivel, "iesi"); assert.equal(cuPlan.motive[0].cod, "stop"); assert.ok(cuPlan.motive.some((m) => m.cod === "plan"), "planul rămâne lângă el");
  assert.equal(c.Consiliu.alcatuieste({ sm: smPlan, concret: CARTELA("fără protecție"), sfaturi: [], afaraContra: null, total: -20 }).motive.some((m) => m.cod === "stop"), false, "în grid, cu „plan” în semafor: ca înainte, fără al doilea motiv");
  assert.match(c.Consiliu.alcatuieste({ sm: SM0, concret: CARTELA("fără protecție"), sfaturi: [], afaraContra: "sus", total: -3 }).faCe, /^Aș pune acum un stop peste prețul de acum/, "short: stopul vine peste preț");
  const pp = c.Consiliu.alcatuieste({ sm: SM0, concret: CARTELA("peste plan"), sfaturi: [], afaraContra: true, total: -20.2 });
  assert.equal(pp.motive[0].titlu.indexOf("Stopul e peste plan"), 0, "stopul peste plan are motivul lui"); assert.equal(pp.nivel, "atentie", "și treapta lui"); assert.doesNotMatch(pp.faCe, /Aș pune acum un stop/);
});

// ---------- F. I-902: o singură cifră pentru margine ----------
const SFAT = [{ cod: "margine", ton: "atentie", parte: "jos", pctJos: 0.9, zile: 53, titlu: "Marginea de jos (60.0000) e cu 0,9% sub preț", text: "O zi obișnuită a monedei ajunge acolo în 53% din zile.", faCe: "N-aș mări levierul și n-aș pune bani în plus în botul ăsta.", copiaza: [{ ce: "marginea", pret: "60.0000" }] }];
await test("F1 titlul Consilierului ia cifra capului (ferestre de 24 h); „% din zile” rămâne doar în explicația motivului", () => {
  const c = CONS(), r = c.Consiliu.alcatuieste({ sm: SM0, sfaturi: SFAT, sanseMargine: { jos: "66 din 100" } });
  assert.equal(r.titlu, "Marginea de jos e la −0,9%, 66 din 100 în 24 h"); assert.doesNotMatch(r.titlu, /din zile/); assert.match(r.motive[0].text, /53% din zile/);
  const v = c.Consiliu.alcatuieste({ sm: SM0, sfaturi: SFAT });
  assert.equal(v.titlu, "Marginea de jos e la −0,9%, atinsă în 53% din zile", "fără cifra capului rămâne ca înainte");
  assert.equal(c.Consiliu.alcatuieste({ sm: SM0, sfaturi: SFAT, sanseMargine: { sus: "12 din 100" } }).titlu, "Marginea de jos e la −0,9%, atinsă în 53% din zile", "cifra altei margini nu se împrumută");
});
await test("F2 „Contează acum”: marginea arătată în cap coboară la un rând scurt, iar locul ei îl ia următorul rând cu bani", () => {
  const c = module_("text-ro.js", "conteaza.js");
  const sf = [SFAT[0], { cod: "zero", iesire: true, pctZero: 2.1, titlu: "Botul iese pe zero la 61.8000 (+2,1% de aici)", text: "…", faCe: "Aș pune take-profit-ul acolo." },
    { cod: "pericol", ton: "atentie", tip: "grid", titlu: "Funding-ul mănâncă grilele", text: "…", faCe: "…" }];
  const stop = { p24: 0.41, stop: 56, d: 2.5, p72: 0.63, perechi: 21, zile: 30 };
  const fara = curat(c.Conteaza.alege({ sfaturi: sf, stop, sanse: [{ cod: "iese-jos-24", p: 0.66 }] }));
  assert.deepEqual(fara.map((x) => x.cheie), ["pericol", "margine", "stop"], "fără cap: marginea rămâne rând întreg");
  const cu = curat(c.Conteaza.alege({ sfaturi: sf, stop, sanse: [{ cod: "iese-jos-24", p: 0.66 }], inCap: "jos" }));
  assert.deepEqual(cu.map((x) => x.cheie + (x.inCap ? "↑" : "")), ["pericol", "stop", "zero", "margine↑"], "trei rânduri cu bani + rândul scurt al marginii");
  const h = c.Conteaza.html(cu, (s) => String(s));
  /* (revizia) rândul marginii rămâne ÎNTREG, la un clic: pliu cu titlul în „summary” și rândul cu „ce aș face” și prețul de copiat înăuntru */
  assert.match(h, /<details class="ctInCap"><summary>↑ <b>Marginea de jos \(60\.0000\) e cu 0,9% sub preț<\/b> — e în capul paginii<\/summary><div class="ctRand ctGalben">/);
  const [afaraPliu, inPliu] = h.split('<details class="ctInCap">'); assert.equal((afaraPliu.match(/class="ctRand /g) || []).length, 3);
  assert.match(inPliu, /N-aș mări levierul și n-aș pune bani în plus/); assert.match(inPliu, /copiază marginea 60\.0000/); assert.match(inPliu, /<\/details>$/);
  assert.deepEqual(curat(c.Conteaza.alege({ sfaturi: sf, stop, inCap: "sus" })).map((x) => x.cheie), ["pericol", "margine", "stop"], "capul vorbește despre cealaltă margine: rândul rămâne");
  assert.equal(c.Conteaza.acasa(cu, "HYPE").titlu.indexOf("HYPE: stopul"), 0, "Acasă nu ia rândul scurt");
  const rosu = curat(c.Conteaza.alege({ sfaturi: [{ ...SFAT[0], ton: "critic" }], inCap: "jos" }));
  assert.deepEqual(rosu.map((x) => x.cheie + (x.inCap ? "↑" : "")), ["margine↑"]); assert.equal(c.Conteaza.acasa(rosu, "HYPE"), null, "nici când marginea e roșie: rândul scurt e al Tabloului");
  assert.ok(c.Conteaza.titluriSus(cu).some((t) => /Marginea de jos/.test(t)), "lista de jos își păstrează semnul „↑ e și sus”");
});

// ---------- G. I-905: „Vremea monedei” într-un rând ----------
const SEM = (l) => l.map((x, i) => (x === "-" ? { et: "tf" + i, ton: "neutru", dir: null } : { et: "tf" + i, ton: x === "c" ? "rau" : x === "b" ? "bine" : x === "g" ? "atentie" : "neutru", dir: x === "l" ? "lateral" : "coboara" }));
await test("G1 fraza numără becurile față de bot, spune TradingView pe 4 h și pe o zi, Busola și dovada - fără culoare de verdict", () => {
  const c = module_("text-ro.js", "tv-note.js", "vremea-bot.js");
  const r = c.VremeaBot.rezumat({ sem: SEM(["c", "c", "-", "c", "c", "c"]), tv: { iv: { "4h": { all: -0.7 }, "1D": { all: -0.3 } } }, tvClasa: c.TvNote.clasa, busola: "asteapta",
    dovada: "pe boții tăi: nu s-a dovedit că becurile ajută (fără bec împotrivă: mediana +0,4%, 59% pe plus, din 715)" });
  assert.equal(r.text, "Vremea monedei: din 6 intervale: 5 contra botului, 1 fără lumânări · TradingView: vinde tare pe 4 h, vinde pe 1 zi · Busola așteaptă — pe boții tăi: nu s-a dovedit că becurile ajută");
  assert.equal(r.contra, 5); assert.equal(r.ton, undefined, "rândul nu poartă ton");
});
await test("G2 fraza: cu botul / laterale / împing gridul la plural potrivit; fără dovadă spune „nedovedită”; fără nimic de spus rămâne goală", () => {
  const c = module_("text-ro.js", "tv-note.js", "vremea-bot.js"), V = c.VremeaBot.rezumat;
  assert.equal(V({ sem: SEM(["b", "b", "l", "l", "g", "c"]) }).text, "Vremea monedei: din 6 intervale: 1 contra botului, 2 cu botul, 2 laterale, 1 împinge gridul — informație, nedovedită pe boții tăi");
  assert.equal(V({ sem: SEM(["-", "-", "-"]) }).text, "Vremea monedei: becurile: se aduc lumânările — informație, nedovedită pe boții tăi");
  assert.equal(V({ sem: [], tv: null }).gol, true); assert.equal(V({}).text, "");
  assert.equal(V({ sem: SEM(["l"]), tv: { iv: { "4h": { all: null } } }, tvClasa: c.TvNote.clasa, busola: "inclinat-short" }).text, "Vremea monedei: din 1 interval: 1 lateral · Busola înclină short — informație, nedovedită pe boții tăi");
});
await test("G3 pagina: rândul Vremii stă deasupra, tabelul intervalelor, TradingView și indicatorii în pliul „pe larg” (nimic scos), care își ține minte starea", () => {
  const h = citeste("public", "index.html"), a = cuTablou(citeste("public", "app.js")), i = h.indexOf('id="tbVremeaLarg"'), j = h.indexOf("</details></div></div></div><section class=\"tbCons\" id=\"tbSemaforCard\"");
  assert.ok(h.indexOf('id="tbVremea"') > 0 && h.indexOf('id="tbVremea"') < i && i < j, "ordinea: rândul, apoi pliul");
  const pliu = h.slice(i, j); for (const id of ["tbDirectieRezumat", "tbIndicatoriRezumat", "tbTrend", "tbTrendBoti", "tbTvNote", "tbTrendDet", "tbIndicatori", "tbTrendMediu"]) assert.ok(pliu.includes('id="' + id + '"'), id + " trebuie să fie în pliu");
  assert.match(pliu, /Becul hotărăște/); assert.match(h, /<script src="\/lib\/vremea-bot\.js"><\/script>/); assert.match(citeste("public", "sw.js"), /"\/lib\/vremea-bot\.js"/);
  assert.match(a, /localStorage\.getItem\("tbVremeaLargDeschis"\)==="1"/); assert.match(a, /try\{tbVremeaLargTine\(\)\}catch/);
  assert.match(a, /function renderTabloTrend\(\)\{\n  try\{tbVremeaDeseneaza\(\)\}catch\(e\)\{\}/);
});

// ---------- H. I-908: proba marginii (regulile scrise înainte: docs/cercetare/2026-11-21-v100374-proba-marginii.md) ----------
const PM = await import("./lib/proba-margine.mjs");
const MIN = 60000, ZI0 = Date.UTC(2026, 9, 1);
/* un bot închis (forma arhivei) și drumul lui, un punct pe minut: prețul și totalul pe minute */
const botA = (o) => ({ strategyId: String(o.id), buOrderType: "futures_grid", createTime: o.creat, closeTime: o.creat + (o.min || 600) * MIN,
  buOrderData: { totalRealizedProfit: o.final, totalFee: 0, totalFundingFee: 0, quoteInvestment: 100, usdtInvestment: 100, leverage: 3, trend: o.dir || "long", bottom: 90, top: 110, lossStop: o.stop ?? null } });
const drum = (creat, f, n, start = 0) => Array.from({ length: n }, (_, k) => { const m = start + k, q = f(m); return { t: creat + m * MIN, pretPerp: q[0], profitTotal: q[1], perechi: m, gridProfitBrut: m / 100 }; });
await test("H1 episodul: prima trecere de marginea contra; „închis la margine” = totalul de atunci minus comisionul maxim; diferența față de netul de la închidere", () => {
  /* long 90–110, 3×, 100 USDT: minutul 30 e primul sub 90 (total −9); botul se închide la −20 */
  const x = botA({ id: 7, creat: ZI0, final: -20 }), L = drum(ZI0, (m) => (m < 30 ? [95, -2] : m < 200 ? [89, -9 - (m - 30) / 100] : [86, -15]), 400);
  const e = PM.episod(x, L);
  assert.equal(e.t0, ZI0 + 30 * MIN); assert.equal(e.zi, "2026-10-01"); assert.equal(e.laMargine, -9); assert.ok(Math.abs(e.comision - 100 * 3 * 0.0005) < 1e-12);
  assert.ok(Math.abs(e.d - (-20 - (-9 - 0.15))) < 1e-9, "d = " + e.d); assert.ok(Math.abs(e.dPct - (-10.85)) < 1e-9); assert.equal(e.nou, false, "înainte de 21.11.2026 = istorie");
  assert.ok(Math.abs(e.dupa[1].total - (-0.6)) < 1e-9, "la o oră după: " + JSON.stringify(e.dupa[1])); assert.equal(e.dupa[1].inGrid, false); assert.equal(e.dupa[24], null, "drumul nu ajunge la 24 h");
  /* (revizia) suma pusă e cea de la clipa trecerii: marja adăugată după nu micșorează procentul */
  const xM = botA({ id: 9, creat: ZI0, final: -20 }); xM.buOrderData.extraMargin = 200;
  const eM = PM.episod(xM, L.map((q) => ({ ...q, investit: 100 }))); assert.equal(eM.inv, 100); assert.ok(Math.abs(eM.dPct - (-10.85)) < 1e-9, "dPct = " + eM.dPct);
  assert.equal(PM.episod(xM, L).inv, 300, "fără suma din drum rămâne cea din arhivă");
  /* short: trecerea e peste marginea de sus */
  const s = PM.episod(botA({ id: 8, creat: ZI0, final: 3, dir: "short" }), drum(ZI0, (m) => (m < 10 ? [100, 0] : m < 20 ? [111, -4] : [105, 2]), 120));
  assert.equal(s.t0, ZI0 + 10 * MIN); assert.ok(Math.abs(s.d - (3 - (-4 - 0.15))) < 1e-9); assert.equal(s.dupa[1].inGrid, true, "după o oră era înapoi în grid");
});
await test("H2 cine nu intră: botul neutru, cel fără drum, cel cu drumul tăiat la început, cel pornit dincolo de margine, cel rămas în grid", () => {
  const f = (o, L) => PM.episod(botA({ id: 1, creat: ZI0, final: -5, ...o }), L).fara;
  assert.equal(f({ dir: "neutral" }, drum(ZI0, () => [80, -9], 50)), "neutru");
  assert.equal(f({}, []), "fara-drum");
  assert.equal(f({}, drum(ZI0, () => [80, -9], 50, 40)), "drum-taiat", "drumul începe la 40 de minute după pornire");
  assert.equal(f({}, drum(ZI0, () => [80, -9], 50)), "pornit-afara");
  assert.equal(f({}, drum(ZI0, () => [95, 1], 50)), "in-grid");
  /* (revizia) un gol de peste 5 minute chiar înaintea trecerii: clipa ei nu se știe ⇒ în afara probei; un gol mai devreme nu strică */
  const cuGol = (de, pana) => drum(ZI0, (m) => (m < 30 ? [95, -2] : [89, -9]), 100).filter((q) => { const m = (q.t - ZI0) / MIN; return m < de || m >= pana; });
  assert.equal(f({}, cuGol(20, 30)), "gol"); assert.equal(PM.episod(botA({ id: 1, creat: ZI0, final: -5 }), cuGol(5, 20)).t0, ZI0 + 30 * MIN); assert.equal(PM.MAX_GOL_MIN, 5);
  assert.equal(PM.episod({ buOrderType: "spot_grid" }, []), null);
});
const EPIS = (n, zile, dPct, nouDe = Infinity) => Array.from({ length: n }, (_, k) => ({ id: String(k), t0: ZI0 + (k % zile) * 864e5, zi: new Date(ZI0 + (k % zile) * 864e5).toISOString().slice(0, 10), d: dPct(k), dPct: dPct(k), stop: k % 2 === 0, nou: k >= nouDe, dupa: { 1: { total: -1, inGrid: k % 4 === 0 }, 4: null, 24: null } }));
await test("H3 verdictul: doar de la 60 de episoade pe 20 de zile; intervalul pe zile întreg sub 0 ⇒ „inchiderea”, peste 0 ⇒ „lasatul”, altfel „n-am aflat”", () => {
  assert.equal(PM.MIN_EPISOADE, 60); assert.equal(PM.MIN_ZILE, 20); assert.equal(PM.COMISION_INCHIDERE, 0.0005); assert.equal(PM.START, Date.UTC(2026, 10, 21));
  const jos = PM.bilant(EPIS(80, 25, (k) => -6 + (k % 5)));
  assert.equal(jos.n, 80); assert.equal(jos.zile, 25); assert.equal(jos.verdict, "inchiderea"); assert.ok(jos.ic[1] < 0 && jos.ic[0] < jos.medie && jos.medie < jos.ic[1]);
  assert.equal(PM.bilant(EPIS(80, 25, (k) => 6 - (k % 5))).verdict, "lasatul");
  assert.equal(PM.bilant(EPIS(80, 25, (k) => (k % 2 ? 9 : -9) + (k % 7) - 3)).verdict, "n-am aflat");
  assert.equal(PM.bilant(EPIS(59, 25, () => -6)).verdict, null, "59 de episoade: doar cifre"); assert.equal(PM.bilant(EPIS(80, 19, (k) => -6 + (k % 3))).verdict, null, "19 zile: doar cifre");
  assert.deepEqual(jos.dupa[1], { n: 80, intorsi: 20, medie: -1 }); assert.equal(jos.cuStop.n, 40); assert.equal(jos.faraStop.n, 40);
  assert.deepEqual(PM.bilant(EPIS(80, 25, (k) => -6 + (k % 5))).ic, jos.ic, "aceeași sămânță, același interval");
  assert.equal(PM.bilant(EPIS(12, 9, (k) => -6 + (k % 5))).ic, null, "sub 10 zile nu se arată niciun interval"); assert.ok(PM.bilant(EPIS(12, 10, (k) => -6 + (k % 5))).ic, "de la 10 zile, da");
});
await test("H4 istoria și datele noi, fiecare cu intervalul de partea opusă a lui 0 ⇒ „n-am aflat” (se contrazic)", () => {
  const E = EPIS(160, 40, (k) => (k < 80 ? -8 + (k % 3) : 5 + (k % 3)), 80), b = PM.bilant(E);
  assert.equal(b.vechi.n, 80); assert.equal(b.nou.n, 80); assert.ok(b.vechi.ic[1] < 0 && b.nou.ic[0] > 0); assert.equal(b.verdict, "n-am aflat"); assert.equal(b.seContrazic, true);
});
await test("H5 drumul rărit: 5 minute în prima oră, apoi 15; primul, ultimul și clipa trecerii rămân; rândul = [t, preț, total, perechi, grile]", () => {
  const L = drum(ZI0, (m) => [100 - m / 100, -m / 10], 301), t0 = ZI0 + 77 * MIN, r = PM.rareste(L, t0);
  assert.deepEqual(r[0], [ZI0, 100, 0, 0, 0]); assert.equal(r[r.length - 1][0], ZI0 + 300 * MIN); assert.ok(r.some((q) => q[0] === t0), "clipa trecerii");
  const prima = r.filter((q) => q[0] - ZI0 < 3600000 && q[0] !== t0), apoi = r.filter((q) => q[0] - ZI0 >= 3600000 && q[0] !== t0 && q[0] !== ZI0 + 300 * MIN);
  assert.equal(prima.length, 12); assert.ok(apoi.every((q, i) => !i || q[0] - apoi[i - 1][0] === 15 * MIN), "pasul de 15 minute"); assert.ok(r.length < 40, r.length + " puncte din 301");
  assert.deepEqual(PM.rareste([], null), []);
  const multe = Array.from({ length: 1400 }, (_, k) => [ZI0 + k * 15 * MIN, 95, -1, 0, 0]), tTr = ZI0 + 101 * 15 * MIN, un = PM.uneste(multe, [], tTr);
  assert.ok(un.length <= PM.MAX_RANDURI && un.some((r) => r[0] === tTr), "(revizia a doua) rândul trecerii rămâne și când drumul lung se rărește"); assert.equal(PM.uneste(multe, [], null).some((r) => r[0] === tTr), false);
});

// ---------- I. tura colectorului ----------
await test("I1 tura: judecă boții nefăcuți (cei mai noi întâi, cel mult câți i se spune), ține minte episoadele, păstrează drumul rărit și trimite bilanțul", async () => {
  const { turaProbaMargine, PE_TURA, PAUZA_MS } = await import("./lib/tura-proba-margine.mjs");
  assert.ok(60000 / PAUZA_MS <= 50 && PE_TURA <= 120, "cel mult 50 de scrieri pe minut (limita rutei: 150)");
  const boti = [botA({ id: 1, creat: ZI0, final: -20 }), botA({ id: 2, creat: ZI0 + 864e5, final: 2 }), botA({ id: 3, creat: ZI0 + 2 * 864e5, final: -1 }), { strategyId: "9", buOrderType: "spot_grid" }];
  const D = { 1: drum(ZI0, (m) => (m < 30 ? [95, -2] : [89, -9]), 100), 2: drum(ZI0 + 864e5, () => [95, 1], 100), 3: [] }, trimise = [], cerute = [];
  const d = { acum: ZI0 + 9 * 864e5, pauzaMs: 0, peTura: 2, botiInchisi: async () => boti, cereDrum: async (id) => { cerute.push(id); return { brut: D[id], rarit: null }; }, trimite: async (cale, corp) => { trimise.push([cale.split("action=")[1], corp]); return { ok: true }; } };
  const st = {}, r1 = await turaProbaMargine(d, st);
  assert.deepEqual(cerute, ["3", "2"], "cei mai noi întâi, doi pe tură"); assert.deepEqual(st.facute, { 3: "fara-drum", 2: "in-grid" }); assert.equal(r1.ramasi, 1);
  const r2 = await turaProbaMargine(d, st);
  assert.equal(st.facute[1], "episod"); assert.equal(st.episoade.length, 1); assert.equal(r2.episoadeNoi, 1); assert.equal(r2.ramasi, 0);
  const dr = trimise.filter((q) => q[0] === "drum"), pm = trimise.filter((q) => q[0] === "probaMargine");
  assert.deepEqual(dr.map((q) => q[1].bot), ["2", "1"], "drumul rărit doar unde există drum"); assert.deepEqual(dr[1][1].drum.iesire, { t: ZI0 + 30 * MIN, total: -9 });
  assert.equal(pm.length, 2); assert.equal(pm[1][1].n, 1); assert.equal(pm[1][1].verdict, null); assert.deepEqual(pm[1][1].boti, { total: 3, judecati: 3, necititi: 0, ramasi: 0, episoade: 1, inGrid: 1, faraDrum: 1, drumTaiat: 0, gol: 0, mutat: 0, pornitAfara: 0, neutri: 0 });   /* v100.377: + boții cu drumul necitit */ assert.equal(pm[1][1].inghetat, null);
  assert.equal(st.episoade[0].mutat, false); assert.equal(st.episoade[0].dinNota, false, "(revizia a doua) starea ține semnele episodului");
  cerute.length = 0; await turaProbaMargine(d, st); assert.deepEqual(cerute, [], "nimic de refăcut: niciun drum cerut a doua oară");
});
await test("I2 tura: drumul care n-a venit (rețea) lasă botul nefăcut; copia rărită care există deja nu se rescrie", async () => {
  const { turaProbaMargine } = await import("./lib/tura-proba-margine.mjs");
  const boti = [botA({ id: 1, creat: ZI0, final: -20 }), botA({ id: 2, creat: ZI0 + 864e5, final: 2 })], trimise = [];
  const d = { acum: ZI0 + 9 * 864e5, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async (id) => { if (id === "1") throw new Error("rețea"); return { brut: drum(ZI0 + 864e5, () => [95, 1], 50), rarit: { p: [[1, 1, 0, 0, 0]] } }; }, trimite: async (cale, corp) => { trimise.push(cale.split("action=")[1]); return { ok: true }; } };
  const st = {}; await turaProbaMargine(d, st);
  assert.deepEqual(st.facute, { 2: "in-grid" }); assert.deepEqual(trimise, ["probaMargine"]);
});
await test("I3 (revizia) tura: KV-ul care n-a putut fi citit nu înseamnă „fără drum”; botul e „făcut” abia după ce drumul rărit s-a scris; arhiva goală nu trimite nimic", async () => {
  const { turaProbaMargine, MAX_INCERCARI } = await import("./lib/tura-proba-margine.mjs");
  const boti = [botA({ id: 1, creat: ZI0, final: -20 })], L1 = drum(ZI0, (m) => (m < 30 ? [95, -2] : [89, -9]), 100), trimise = [];
  let citit = false, scrie = false;
  const d = { acum: ZI0 + 9 * 864e5, pauzaMs: 0, botiInchisi: async () => boti, cereDrum: async () => (citit ? { brut: L1, rarit: null, citit: true } : { brut: [], rarit: null, citit: false }),
    trimite: async (cale) => { const a = cale.split("action=")[1]; if (a === "drum" && !scrie) throw new Error("429"); trimise.push(a); return { ok: true }; } };
  const st = {}; await turaProbaMargine(d, st);
  assert.deepEqual(st.facute, {}, "citire picată: botul rămâne de judecat"); citit = true;
  await turaProbaMargine(d, st); assert.deepEqual(st.facute, {}, "scrierea drumului rărit a picat: se reia"); assert.equal(st.incercari[1], 1); assert.equal(st.episoade.length, 0);
  scrie = true; await turaProbaMargine(d, st);
  assert.deepEqual(st.facute, { 1: "episod" }); assert.equal(st.episoade.length, 1, "un singur episod, nu câte unul la fiecare încercare"); assert.deepEqual(trimise.filter((a) => a === "drum"), ["drum"]);
  /* după MAX_INCERCARI scrieri picate, botul se judecă fără copia rărită (drumul întreg rămâne în KV) */
  const st2 = {}; scrie = false; for (let i = 0; i < MAX_INCERCARI; i++) await turaProbaMargine(d, st2); assert.deepEqual(st2.facute, { 1: "episod" }); assert.equal(st2.episoade.length, 1);
  const goala = await turaProbaMargine({ ...d, botiInchisi: async () => [] }, {}); assert.equal(goala.faraArhiva, true);
});
await test("I4 (revizia) verdictul se îngheață o singură dată: la prima tură cu toată arhiva citită și pragul atins; episoadele de după nu-l mai schimbă", async () => {
  const { turaProbaMargine } = await import("./lib/tura-proba-margine.mjs");
  /* 80 de boți, câte unul pe zi din 25 de zile, toți trec de margine și pierd mai mult lăsați (final −20 față de −9 la margine) */
  const mk = (i, fin) => botA({ id: 100 + i, creat: ZI0 + (i % 25) * 864e5 + i * 1000, final: fin }), boti = Array.from({ length: 80 }, (_, i) => mk(i, -20 - (i % 4)));
  const drumDe = (id) => { const x = boti.find((b) => b.strategyId === id); return drum(x.createTime, (m) => (m < 30 ? [95, -2] : [89, -9]), 60); }, pm = [];
  const d = { acum: ZI0 + 40 * 864e5, pauzaMs: 0, peTura: 50, botiInchisi: async () => boti, cereDrum: async (id) => ({ brut: drumDe(id), rarit: { p: [[1, 1, 0, 0, 0]] }, citit: true }), trimite: async (cale, corp) => { if (/probaMargine/.test(cale)) pm.push(corp); return { ok: true }; } };
  const st = {}; await turaProbaMargine(d, st);
  assert.equal(pm[0].n, 50); assert.equal(pm[0].verdict, null, "pragul nu e atins"); assert.equal(st.inghetat, undefined);
  await turaProbaMargine({ ...d, peTura: 20 }, st); assert.equal(pm[1].n, 70); assert.equal(pm[1].boti.ramasi, 10); assert.equal(pm[1].verdict, null, "pragul e atins, dar arhiva nu e citită toată: încă nu");
  await turaProbaMargine({ ...d, acum: ZI0 + 41 * 864e5 }, st);
  assert.equal(pm[2].inghetat.verdict, "inchiderea"); assert.equal(pm[2].inghetat.n, 80); assert.equal(pm[2].inghetat.la, ZI0 + 41 * 864e5); assert.equal(pm[2].verdict, "inchiderea");
  /* vin 30 de boți noi care ar întoarce media: verdictul înghețat rămâne, numărătoarea crește */
  for (let i = 0; i < 30; i++) boti.push(mk(80 + i, 60));
  await turaProbaMargine({ ...d, acum: ZI0 + 50 * 864e5 }, st);
  assert.equal(pm[3].n, 110); assert.equal(pm[3].inghetat.n, 80); assert.equal(pm[3].verdict, "inchiderea"); assert.equal(pm[3].inghetat.la, ZI0 + 41 * 864e5);
});

// ---------- J. ruta, colectorul și pagina Probe ----------
await test("J1 ruta: drumul întreg al botului se poate citi (action=drum, fără tăiere după timp), copia rărită și bilanțul probei se validează la scriere", () => {
  const r = citeste("functions", "api", "istoric-bot.js");
  assert.match(r, /if\(action==="drum"\)\{const bot=idBot\(u\.searchParams\.get\("bot"\)\)/); assert.match(r, /env\.ISTORIC\.put\("drum:"\+bot,/); assert.match(r, /env\.ISTORIC\.put\("proba:margine",/);
});
await test("J1b (revizia) ruta, rulată: drumul întreg fără tăiere după timp, `citit: false` la KV picat, copia rărită și bilanțul validate, verdictul doar înghețat", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(); let strica = false;
  const ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => { if (strica) throw new Error("KV"); return kv.has(k) ? kv.get(k) : null; }, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js"), H = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.7", "content-type": "application/json" };
  const post = async (a, corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: H, body: JSON.stringify(corp) }), env: ENV });
  const get = async (q) => (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?" + q, { headers: H }), env: ENV })).json();
  /* un drum de acum 40 de zile (ruta `citeste` l-ar tăia) vine întreg */
  const vechi = Date.now() - 40 * 864e5; kv.set("ist:77", JSON.stringify([{ t: vechi, pretPerp: 95, profitTotal: -1 }, { t: vechi + 60000, pretPerp: 89, profitTotal: -9 }]));
  let j = await get("action=drum&bot=77"); assert.equal(j.brut.length, 2); assert.equal(j.rarit, null); assert.equal(j.citit, true);
  assert.equal((await get("action=citeste&bot=77&ore=168")).intrari.length, 0, "ruta veche îl taie după timp");
  strica = true; j = await get("action=drum&bot=77"); assert.equal(j.citit, false); assert.equal(j.brut, null); strica = false;
  const drumBun = { creat: vechi, inchis: vechi + 3600000, p: [[vechi, 95, -1, 0, 0], [vechi + 60000, 89, -9, 1, 0.01]], iesire: { t: vechi + 60000, total: -9 } };
  assert.equal((await post("drum", { bot: "77", drum: drumBun })).status, 200); j = await get("action=drum&bot=77&brut=0"); assert.equal(j.rarit.p.length, 2); assert.deepEqual(j.rarit.iesire, { t: vechi + 60000, total: -9, inv: null }); assert.equal(j.brut, null);
  for (const [et, rau] of [["fără puncte", { ...drumBun, p: [] }], ["rând cu text", { ...drumBun, p: [[vechi, "95", -1, 0, 0]] }], ["rând scurt", { ...drumBun, p: [[vechi, 95, -1]] }], ["prea multe", { ...drumBun, p: Array.from({ length: 1201 }, (_, k) => [vechi + k, 95, -1, 0, 0]) }], ["fără creat", { ...drumBun, creat: null }]])
    assert.equal((await post("drum", { bot: "77", drum: rau })).status, 400, et);
  const bil = { forma: 1, la: Date.now() - 1000, n: 75, zile: 31, medie: -4.1, suma: -1890.2, ic: [-6.9, -1.4], verdict: "inchiderea", minEpisoade: 60, minZile: 20, boti: { total: 2518, judecati: 2518, ramasi: 0, episoade: 75, inGrid: 2000, faraDrum: 400, drumTaiat: 15, gol: 3 }, altceva: "x" };
  assert.equal((await post("probaMargine", bil)).status, 200); j = (await get("action=probaMargine")).probaMargine;
  assert.equal(j.verdict, null, "un verdict trimis fără înghețare nu se păstrează"); assert.equal(j.inghetat, null); assert.equal(j.altceva, undefined); assert.equal(j.boti.gol, 3); assert.equal(j.boti.ramasi, 0);
  assert.equal((await post("probaMargine", { ...bil, inghetat: { la: bil.la, n: 75, zile: 31, medie: -4.1, suma: -1890.2, ic: [-6.9, -1.4], verdict: "inchiderea" } })).status, 200);
  j = (await get("action=probaMargine")).probaMargine; assert.equal(j.verdict, "inchiderea"); assert.equal(j.inghetat.n, 75);
  for (const [et, rau] of [["verdict necunoscut", { ...bil, verdict: "sigur" }], ["n text", { ...bil, n: "75" }], ["ic strâmb", { ...bil, ic: [1] }], ["forma", { ...bil, forma: 2 }], ["din viitor", { ...bil, la: Date.now() + 3600000 }]])
    assert.equal((await post("probaMargine", rau)).status, 400, et);
});
await test("J2 colectorul: tura probei marginii e legată (o dată pe oră) și Consilierul lui primește „afară din grid” și totalul, ca pagina", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /if \(val\.medii\) turaProbaMargineColector\(\)\.catch/); assert.match(c, /stareDeDisc\("proba-margine-stare\.json"\)/);
  /* (revizia) `val.medii` e adevărat la fiecare tură: frâna de o oră e a turei, pusă înainte de orice cerere */
  assert.match(c, /margineStare\.inLucru \|\| Date\.now\(\) - \(margineStare\.la \|\| 0\) < 3600000 \|\| Date\.now\(\) - \(margineStare\.esecLa \|\| 0\) < 2 \* 3600000\) return;\n  margineStare\.inLucru = true; margineStare\.la = Date\.now\(\);/); assert.match(c, /cereDrum: \(id\) => cere\("\/api\/istoric-bot\?action=drum&bot=" \+ encodeURIComponent\(id\)\)/);
  assert.match(c, /afaraContra: dirC === "long" && Number\(b\.gridJos\) > 0 && Number\(b\.pretCurent\) > 0 && Number\(b\.pretCurent\) < Number\(b\.gridJos\) \? "jos"/);
  const v = /VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(c); assert.ok(v && Number(v[1]) >= 208, "colectorul de la v101.208 încolo");
});
await test("J3 pagina Probe: rândul probei marginii, la capăt; sub prag doar cifre, la verdict îl spune cu intervalul", () => {
  const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, Intl, sugStare: { d: {} },
    sugCate: (n, s, p) => globalThis.TextRo.cate(n, s, p), sugEsc: (s) => String(s), sugP1: (v) => String(v), sugPc: (v) => String(v), sugZec: (v) => String(v), sugCadZi: (z) => String(z), Caiet: undefined });
  vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "probe-ecran.js"), "utf8"), c);
  const rand = (pm) => { const R = c.prProbe({ probaMargine: pm }, Date.UTC(2026, 10, 22)); return [R[R.length - 1], R.length]; };
  const [gol, n0] = rand(null); assert.equal(gol.k, "margine"); assert.match(gol.jud, /aștept colectorul/); assert.match(gol.sta, /176/);
  const [cif, n1] = rand({ forma: 1, la: Date.UTC(2026, 10, 22) - 3600000, n: 12, zile: 9, medie: -3.24, suma: -210.4, ic: [-7.1, 0.6], verdict: null, minEpisoade: 60, minZile: 20, dupa: { 1: { n: 12, intorsi: 7, medie: -1 } }, boti: { total: 2518, judecati: 180, faraDrum: 150 } });
  assert.equal(n1, n0); assert.match(cif.jud, /^12 episoade în 9 zile/); assert.match(cif.jud, /citiți 180 din 2\.518 boți închiși: 0 rămași în grid, 150 fără drum în arhivă, 0 cu drumul tăiat, cu goluri sau cu gridul mutat chiar la trecere \(boții ținuți peste 7 zile nu intră\)/);
  /* (revizia) sub prag: nicio medie, niciun interval - doar numărătoarea */
  assert.equal(cif.sta, "doar numărătoarea până la prag: diferența dintre „lăsat” și „închis la margine” se arată o singură dată, la verdict"); assert.doesNotMatch(cif.sta + cif.jud + cif.ultima, /3,2|7,1|0,6|înapoi în grid/);
  assert.match(cif.drum.text, /verdictul de la 60 de episoade pe 20 de zile/);
  /* un verdict neînghețat (forma veche) nu se arată; cel înghețat se spune cu data lui, iar episoadele de după se numără */
  const fara = rand({ forma: 1, la: Date.UTC(2026, 10, 22), n: 75, zile: 31, medie: -4.1, suma: -1890.2, ic: [-6.9, -1.4], verdict: "inchiderea", minEpisoade: 60, minZile: 20 })[0]; assert.doesNotMatch(fara.sta, /VERDICT/);
  const ING = { la: Date.UTC(2026, 10, 22, 4), n: 75, zile: 31, medie: -4.1, suma: -1890.2, ic: [-6.9, -1.4], verdict: "inchiderea" };
  const [ver] = rand({ forma: 1, la: Date.UTC(2026, 10, 22), n: 81, zile: 33, medie: 1.2, suma: 40, ic: [-1, 3], verdict: "inchiderea", inghetat: ING, minEpisoade: 60, minZile: 20, boti: { total: 2600, judecati: 2600, ramasi: 0 } });
  assert.match(ver.sta, /^VERDICT \(înghețat la 22\.11 06:00, pe 75 de episoade în 31 de zile\): închiderea la margine ar fi fost mai bună · lăsat − închis la margine: −4,1% din suma pusă, în medie pe bot \(interval 95% pe zile: −6,9% … −1,4%\) · în total −1890,2 USDT · de atunci s-au mai adunat 6 episoade \(verdictul nu se schimbă\)$/);
});

// ---------- L. I-911: afară din grid - de cât timp și câți se întorc ----------
const BANDA = [{ h: 1, n: 107, intoarse: 0.7009 }, { h: 3, n: 76, intoarse: 0.5789 }, { h: 6, n: 55, intoarse: 0.4 }, { h: 12, n: 44, intoarse: 0.2727 }, { h: 24, n: 33, intoarse: 0.0909 }, { h: 48, n: 12, intoarse: 0.04 }];
const AFARA = { ...BAZA, pret: 56.933, stop: 54, laStop: -32.7, total: -20.2 };
await test("L1 afară din grid: durata și treapta cea mai lungă deja împlinită din jurnalul benzii (câte episoade s-au întors în grid în 24 h)", () => {
  const c = module_("text-ro.js", "cap-margine.js"), t = (ore, banda = BANDA, x = AFARA) => c.CapMargine.textAfara(c.CapMargine.alcatuieste({ ...x, afaraOre: ore, banda }));
  assert.equal(t(6 + 20 / 60), "Afară din grid de 6 h 20 min · la tine, când prețul a stat afară 6 ore la rând, s-a întors în grid în următoarele 24 de ore în 40 din 100 de cazuri (55 de episoade, ieșiri pe oricare parte a gridului)");
  assert.equal(t(1), "Afară din grid de 1 h · la tine, când prețul a stat afară 1 oră la rând, s-a întors în grid în următoarele 24 de ore în 70 din 100 de cazuri (107 episoade, ieșiri pe oricare parte a gridului)");
  assert.equal(t(0.4), "Afară din grid de 24 de minute", "sub o oră nu există treaptă: doar durata");
  assert.match(t(30), /^Afară din grid de 30 h · la tine, când prețul a stat afară 24 de ore la rând, .* în 9 din 100 de cazuri \(33 de episoade, ieșiri pe oricare parte a gridului\)$/);
  assert.match(t(60), /^Afară din grid de 3 zile · la tine, când prețul a stat afară 24 de ore la rând/, "treapta de 48 h are doar 12 episoade: se ia cea de 24 h");
  assert.equal(t(6.999), "Afară din grid de 7 h · la tine, când prețul a stat afară 6 ore la rând, s-a întors în grid în următoarele 24 de ore în 40 din 100 de cazuri (55 de episoade, ieșiri pe oricare parte a gridului)", "59,9 minute nu se scriu „60 min”");
  assert.equal(t(5, null), "Afară din grid de 5 h", "fără jurnalul benzii rămâne durata");
});
await test("L2 rândul apare doar afară din grid contra botului și doar cu durata știută", () => {
  const c = module_("text-ro.js", "cap-margine.js");
  assert.equal(c.CapMargine.textAfara(c.CapMargine.alcatuieste({ ...BAZA, afaraOre: 6, banda: BANDA })), "", "în grid nu se scrie");
  assert.equal(c.CapMargine.textAfara(c.CapMargine.alcatuieste({ ...AFARA, afaraOre: null, banda: BANDA })), ""); assert.equal(c.CapMargine.textAfara(c.CapMargine.alcatuieste({ ...AFARA, afaraOre: 0, banda: BANDA })), "");
  const a = cuTablou(citeste("public", "app.js")), pz = citeste("public", "lib", "asezare-paznic.js");
  assert.match(a, /afO=acA&&botiNr\(acA\.afaraOre\)>0\?botiNr\(acA\.afaraOre\)\+\(Date\.now\(\)-acA\.la\)\/3600000:null/, "durata e adusă la zi cu ceasul"); assert.match(a, /afaraOre:afO,banda:tbBandaPt\(\)/); assert.match(pz, /class="pzMargAfara"/);
});

// ---------- M. I-909: trecerea de margine notată pe viu ----------
const VIU = { dir: "long", jos: 90, sus: 110, creat: ZI0 };
await test("M1 nota botului pornit: drumul rărit + clipa primei treceri; nota următoare citește doar ce n-a fost citit și nu mută trecerea", () => {
  const L1 = drum(ZI0, (m) => [95, -1], 60).map((q) => ({ ...q, investit: 100 })), n1 = PM.notaVie(VIU, L1, null);
  assert.equal(n1.stare, "ok"); assert.equal(n1.iesire, null); assert.equal(n1.scanat, ZI0 + 59 * MIN); assert.equal(n1.p[0][0], ZI0);
  const rar1 = { viu: true, stare: n1.stare, scanat: n1.scanat, p: n1.p, iesire: n1.iesire };
  const L2 = drum(ZI0, (m) => (m < 90 ? [95, -1] : [89, -9 - (m - 90) / 10]), 150).map((q) => ({ ...q, investit: 100 })), n2 = PM.notaVie(VIU, L2, rar1);
  assert.deepEqual(n2.iesire, { t: ZI0 + 90 * MIN, total: -9, inv: 100 }); assert.equal(n2.stare, "ok"); assert.ok(n2.p.some((r) => r[0] === ZI0 + 90 * MIN), "clipa trecerii rămâne în drumul rărit");
  /* după o săptămână drumul brut nu mai are începutul; trecerea notată rămâne aceeași */
  const rar2 = { viu: true, stare: "ok", scanat: n2.scanat, p: n2.p, iesire: n2.iesire }, L3 = drum(ZI0, () => [88, -14], 200, 120), n3 = PM.notaVie(VIU, L3, rar2);
  assert.deepEqual(n3.iesire, n2.iesire); assert.equal(n3.p[0][0], ZI0, "începutul drumului se păstrează"); assert.equal(n3.scanat, ZI0 + 319 * MIN);
});
await test("M2 nota nu e bună: prima notă venită târziu, un gol între note, golul dinaintea trecerii, botul găsit afară de la primul punct", () => {
  assert.equal(PM.notaVie(VIU, drum(ZI0, () => [95, -1], 30, 40), null).stare, "taiat", "prima notă la 40 de minute după pornire");
  const rar = { viu: true, stare: "ok", scanat: ZI0 + 59 * MIN, p: [[ZI0, 95, -1, 0, 0]], iesire: null };
  const sarit = PM.notaVie(VIU, drum(ZI0, () => [89, -9], 30, 200), rar); assert.equal(sarit.stare, "taiat", "între note au rămas minute necitite"); assert.equal(sarit.iesire, null);
  const gol = drum(ZI0, (m) => (m < 100 ? [95, -1] : [89, -9]), 140).filter((q) => { const m = (q.t - ZI0) / MIN; return m < 80 || m >= 100; });
  assert.equal(PM.notaVie(VIU, gol, rar).stare, "gol"); assert.equal(PM.notaVie(VIU, drum(ZI0, () => [80, -9], 20), null).stare, "pornit-afara");
  assert.equal(PM.notaVie({ ...VIU, dir: "neutral" }, drum(ZI0, () => [95, 1], 20), null), null); assert.equal(PM.notaVie(VIU, [], null), null);
  assert.equal(PM.notaVie(VIU, drum(ZI0, () => [89, -9], 30, 200), { ...rar, stare: "gol" }).stare, "gol", "o notă stricată rămâne stricată");
  /* ce s-a citit deja nu se mai judecă: un punct de dincolo de margine de dinaintea lui `dupaT` nu e „trecerea” */
  const cuVechi = drum(ZI0, (m) => (m === 10 || m >= 50 ? [89, -9] : [95, -1]), 80);
  assert.equal(PM.trecere(VIU, cuVechi, ZI0 + 20 * MIN).iesire.t, ZI0 + 50 * MIN); assert.equal(PM.trecere(VIU, cuVechi, 0).iesire.t, ZI0 + 10 * MIN);
});
await test("M3 la închidere: botul cu drumul tăiat își ia episodul din notă (cu suma pusă de atunci); fără notă bună rămâne „drum tăiat”", () => {
  const x = botA({ id: 21, creat: ZI0, final: -30, min: 12 * 1440 }), coada = drum(ZI0, () => [86, -25], 300, 9 * 1440);
  assert.equal(PM.episodCuNota(x, coada, null).fara, "drum-taiat");
  const nota = { viu: true, stare: "ok", scanat: ZI0 + 9 * 1440 * MIN + 5 * MIN, p: [[ZI0, 95, -1, 0, 0]], iesire: { t: ZI0 + 90 * MIN, total: -9, inv: 100 } };
  const e = PM.episodCuNota(x, coada, nota);
  assert.equal(e.t0, ZI0 + 90 * MIN); assert.equal(e.dinNota, true); assert.ok(Math.abs(e.d - (-30 - (-9 - 0.15))) < 1e-9); assert.ok(Math.abs(e.dPct - (-20.85)) < 1e-9); assert.deepEqual(e.dupa, { 1: null, 4: null, 24: null });
  /* trecerea a venit după ultima notă: se caută în coada necitită a drumului */
  const faraIesire = { ...nota, iesire: null, scanat: ZI0 + 9 * 1440 * MIN + 5 * MIN }, coada2 = drum(ZI0, (m) => (m < 9 * 1440 + 50 ? [95, -3] : [89, -11]), 300, 9 * 1440);
  assert.equal(PM.episodCuNota(x, coada2, faraIesire).t0, ZI0 + (9 * 1440 + 50) * MIN); assert.equal(PM.episodCuNota(x, drum(ZI0, () => [95, -3], 300, 9 * 1440), faraIesire).fara, "in-grid");
  assert.equal(PM.episodCuNota(x, coada, { ...nota, scanat: ZI0 + 8 * 1440 * MIN }).fara, "drum-taiat", "între ultima notă și drumul rămas e un gol");
  assert.equal(PM.episodCuNota(x, coada, { ...nota, stare: "taiat" }).fara, "drum-taiat"); assert.equal(PM.episodCuNota(x, coada, { ...nota, stare: "pornit-afara" }).fara, "pornit-afara");
  assert.equal(PM.episodCuNota(x, coada, { ...nota, viu: undefined }).fara, "drum-taiat", "copia de la închidere nu e notă de pe viu");
});
await test("M4 tura: boții porniți primesc nota (long / short, cu drum citit), ruta o păstrează cu `viu`, iar la închidere copia se încheie cu tot drumul", async () => {
  const { pastreazaVii, turaProbaMargine } = await import("./lib/tura-proba-margine.mjs"), trimise = [];
  const D = { 5: { brut: drum(ZI0, (m) => (m < 30 ? [95, -1] : [89, -9]), 60), rarit: null, citit: true }, 6: { brut: drum(ZI0, () => [100, 1], 60), rarit: null, citit: true }, 7: { brut: [], rarit: null, citit: false }, 8: { brut: drum(ZI0, () => [95, 1], 60), rarit: { p: [[1, 1, 0, 0, 0]] }, citit: true } };
  const d = { pauzaMs: 0, botiVii: async () => ({ bots: [{ id: 5, directie: "long", gridJos: 90, gridSus: 110, pornitLa: ZI0 }, { id: 6, directie: "neutral", gridJos: 90, gridSus: 110, pornitLa: ZI0 }, { id: 7, directie: "short", gridJos: 90, gridSus: 110, pornitLa: ZI0 }, { id: 8, directie: "long", gridJos: 90, gridSus: 110, pornitLa: ZI0 }] }),
    cereDrum: async (id) => D[id], trimite: async (cale, corp) => { trimise.push(corp); return { ok: true }; } };
  const r = await pastreazaVii(d);
  assert.deepEqual(r, { vii: 4, scrise: 1 }, "neutrul, cel necitit și cel cu copia de la închidere nu primesc notă"); assert.equal(trimise[0].bot, "5"); assert.equal(trimise[0].drum.viu, true); assert.equal(trimise[0].drum.inchis, null); assert.equal(trimise[0].drum.stare, "ok"); assert.equal(trimise[0].drum.iesire.t, ZI0 + 30 * MIN);
  /* ruta: nota de pe viu trece fără `inchis`; fără `viu` cere `inchis` */
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js"), H = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.8", "content-type": "application/json" };
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=drum", { method: "POST", headers: H, body: JSON.stringify(corp) }), env: ENV });
  assert.equal((await post(trimise[0])).status, 200); const pus = JSON.parse(kv.get("drum:5")); assert.equal(pus.viu, true); assert.equal(pus.stare, "ok"); assert.equal(pus.scanat, ZI0 + 59 * MIN); assert.equal(pus.iesire.total, -9);
  assert.equal((await post({ bot: "5", drum: { ...trimise[0].drum, viu: false } })).status, 400, "fără `viu`, `inchis` e cerut");
  /* la închidere, botul cu nota de pe viu: copia se rescrie cu drumul întreg, fără `viu` */
  const st = {}, tr2 = [];
  await turaProbaMargine({ acum: ZI0 + 9 * 864e5, pauzaMs: 0, botiInchisi: async () => [botA({ id: 5, creat: ZI0, final: -20, min: 60 })], cereDrum: async () => ({ brut: D[5].brut, rarit: pus, citit: true }), trimite: async (cale, corp) => { tr2.push([cale.split("action=")[1], corp]); return { ok: true }; } }, st);
  assert.equal(st.facute[5], "episod"); const fin = tr2.find((q) => q[0] === "drum")[1].drum; assert.equal(fin.inchis, ZI0 + 60 * MIN); assert.equal(fin.viu, undefined); assert.ok(fin.p.length >= pus.p.length);
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /await pastreazaViiModul\(\{ botiVii: cereBotiPorniti, cereDrum: /);
});

// ---------- N. I-910: registrul sfaturilor pe orizontul scurt ----------
await test("N1 „ce a urmat la 1 h și la 4 h”: totalul din drum la clipa aceea și judecata lui (ține = n-a scăzut; ieși = a scăzut, peste pragul de zgomot)", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"), SB = c.SemnaleBot;
  /* totalul scade cu 1 USDT pe oră: −1 la sfat, −2 după o oră, −5 după 4 ore; investit 100 ⇒ pragul de zgomot 0,5 */
  const L = drum(ZI0, (m) => [95, -1 - m / 60], 400), log = [{ t: ZI0, cod: "trend", nivel: "atentie", total: -1, dreptate: null }, { t: ZI0, cod: "tine", nivel: "tine", total: -1, dreptate: null }, { t: ZI0 + 300 * MIN, cod: "muta", nivel: "atentie", total: -6, dreptate: null }, { t: ZI0, cod: "btc", nivel: "atentie", total: null, dreptate: null }];
  const j = curat(SB.judecaLaOrizont(log, L, 100));
  assert.ok(Math.abs(j[0].o1 - (-2)) < 1e-9); assert.equal(j[0].d1, true, "ieși: totalul a scăzut"); assert.ok(Math.abs(j[0].o4 - (-5)) < 1e-9); assert.equal(j[0].d4, true); assert.equal(j[0].oj, true);
  assert.equal(j[1].d1, false, "ține: totalul a scăzut ⇒ n-a avut dreptate"); assert.equal(j[1].d4, false);
  assert.equal(j[2].o4, undefined, "drumul se termină înainte de 4 h după sfat"); assert.ok(Math.abs(j[2].o1 - (-7)) < 1e-9); assert.equal(j[2].oj, true);
  assert.equal(j[3].oj, undefined, "sfatul fără total nu se judecă"); assert.deepEqual(curat(SB.judecaLaOrizont(j, L, 100)), j, "a doua trecere nu schimbă nimic");
  assert.deepEqual(curat(SB.judecaLaOrizont(j, drum(ZI0, () => [95, -50], 400), 100)), j, "nici cu alt drum: ce s-a judecat o dată rămâne");
  const plat = curat(SB.judecaLaOrizont([{ t: ZI0, cod: "trend", nivel: "atentie", total: -1, dreptate: null }], drum(ZI0, (m) => [95, -1.3], 400), 100));
  assert.equal(plat[0].d1, false, "o scădere sub pragul de zgomot nu e „a avut dreptate”");
  assert.equal(curat(SB.judecaLaOrizont([{ t: ZI0, cod: "trend", nivel: "atentie", total: -1, dreptate: null }], [], 100))[0].oj, true, "fără drum: marcat ca citit, fără cifre");
  const gaura = curat(SB.judecaLaOrizont([{ t: ZI0, cod: "trend", nivel: "atentie", total: -1, dreptate: null }], L.filter((q) => { const m = (q.t - ZI0) / MIN; return m < 20 || m > 100; }), 100))[0];
  assert.equal(gaura.o1, undefined, "(revizia a doua) cu un gol în drum, „la o oră” nu ia punctul de la minutul 19"); assert.ok(Math.abs(gaura.o4 - (-5)) < 1e-9);
});
await test("N2 registrul: lângă judecata de la închidere, numărătoarea de la 1 h și 4 h (o dată pe bot), iar textul o spune ca descriere, nu ca dovadă", () => {
  const c = module_("text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js"), SB = c.SemnaleBot, loguri = [];
  for (let i = 0; i < 14; i++) loguri.push([{ t: ZI0 + i * 864e5, cod: "trend", nivel: "atentie", total: -1, dreptate: i % 2 === 0, totalDupa: -3, o1: -2, d1: i < 9, o4: -5, d4: i < 4, oj: true }, { t: ZI0 + i * 864e5 + 1000, cod: "trend", nivel: "atentie", total: -1, dreptate: true, totalDupa: -3, o1: -2, d1: true, oj: true },
    { t: ZI0 + i * 864e5, cod: "tine", nivel: "tine", total: 1, dreptate: true, totalDupa: 2, o1: 2, d1: i % 3 === 0, oj: true }]);
  const r = curat(SB.socotealaToti(loguri));
  assert.equal(r.trend.la1.judecate, 14, "al doilea „trend” al aceluiași bot nu se numără"); assert.equal(r.trend.la1.corecte, 9); assert.equal(r.trend.la4.judecate, 14); assert.equal(r.trend.la4.corecte, 4); assert.equal(r.trend.la1.zile, 14);
  assert.equal(r.tine.la1.corecte, 5); assert.equal(r.tine.la4, null, "fără nicio judecată la 4 h");
  const t = SB.textIncredere(r.trend, "trend");
  assert.match(t, / · la o oră după sfat: 9 din 14 \(\d+,\d% față de \d+,\d% de obicei, pe 14 zile\) · la 4 ore: 4 din 14 \(.*\) \(pe orizontul scurt e doar descriere, nu dovadă\)$/);
  assert.doesNotMatch(SB.textIncredere({ ...r.trend, la1: null, la4: null }, "trend"), /la o oră/); assert.doesNotMatch(SB.textIncredere({ ...r.trend, la1: { judecate: 4, corecte: 2 }, la4: null }, "trend"), /la o oră/, "sub 5 judecăți nu se scrie");
  assert.equal(r.trend.stare, curat(SB.socotealaToti(loguri.map((l) => l.map((e) => ({ t: e.t, cod: e.cod, nivel: e.nivel, total: e.total, dreptate: e.dreptate, totalDupa: e.totalDupa }))))).trend.stare, "orizonturile nu schimbă starea sfatului");
});
await test("N3 ruta și colectorul: jurnalul păstrează o1 / d1 / o4 / d4 doar cu `oj`, registrul păstrează la1 / la4; colectorul citește drumul o dată pe bot, cel mult 25 pe tură", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js"), H = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.9", "content-type": "application/json" };
  const post = (a, corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=" + a, { method: "POST", headers: H, body: JSON.stringify(corp) }), env: ENV });
  assert.equal((await post("semnale", { bot: "9", log: [{ t: ZI0, cod: "trend", nivel: "atentie", total: -1, o1: -2, d1: true, o4: -5, d4: false, oj: true }, { t: ZI0 + 1, cod: "tine", nivel: "tine", total: 1, o1: 7, d1: true }] })).status, 200);
  const l = JSON.parse(kv.get("semnale:9")).log; assert.equal(l[0].o1, -2); assert.equal(l[0].d1, true); assert.equal(l[0].d4, false); assert.equal(l[0].oj, true); assert.equal(l[1].o1, undefined, "fără `oj` cifrele nu se păstrează"); assert.equal(l[1].oj, undefined);
  assert.equal((await post("socoteala", { la: Date.now(), boti: 3, peCod: { trend: { n: 14, judecate: 14, corecte: 7, la1: { judecate: 14, corecte: 9, zile: 14, rataZile: 0.64, reper: 0.5, altceva: 1 }, la4: "x" } } })).status, 200);
  const pc = JSON.parse(kv.get("socoteala")).peCod.trend; assert.deepEqual(pc.la1, { judecate: 14, corecte: 9, zile: 14, rataZile: 0.64, reper: 0.5 }); assert.equal(pc.la4, null);
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /if \(orizonturi < 25 && log\.some\(\(e\) => e && e\.oj !== true && e\.total !== null && e\.total !== undefined\)\) \{/); assert.match(col, /dr\.citit !== false && Array\.isArray\(dr\.brut\)/); assert.match(col, /SemnaleBot\.judecaLaOrizont\(log, dr\.brut, tj && tj\.investit \|\| 0\)/);
});

// ---------- O. „Dacă muți gridul acum” (el, 21.11: „cât mă costă să mut gridul acum?” ⇒ „vreau să pui și statisticile astea și probabilitățile”) ----------
/* botul lui de la 07:57: HYPE long 3×, grid 60–66, prețul 56,333, stop 54, afară de 3,4 h */
const ACUM_O = new Date(2026, 10, 21, 7, 57, 0).getTime();
const MUT = { ...BAZA, pret: 56.333, stop: 54, laMargine: () => -7.49, laStop: -32.68, total: -22.77, afaraOre: 3.4, banda: BANDA, stopDrum: 0.44, acum: ACUM_O,
  mut: { iei: 71.56, investit: 94.44, comInchidere: 0.118, levier: 3, pretZero: 62.1806, grile: 2.56, perechi: 107, oreInGrid: 14.1 } };
await test("O1 costul mutării: pierderea încasată și comisioanele; ce rămâne pe masă la stop, la margine și la zero; riscul față de ce se recuperează", () => {
  const c = module_("text-ro.js", "cap-margine.js"), m = c.CapMargine.textMut(c.CapMargine.alcatuieste(MUT));
  assert.equal(m.titlu, "Dacă muți gridul acum: încasezi pierderea de −22,9 USDT (iei 71,6 din 94,4 USDT, după comisionul de închidere) · intrarea botului nou ≈ 0,1 USDT (estimat)", "(revizia a doua) comisionul de închidere e deja în „iei”: nu se numără de două ori");
  assert.equal(m.randuri[0], "Dacă rămâi: la stopul tău (54.0000, −4,1%): −32,7 USDT · la marginea de jos (60.0000, +6,5%): −7,5 USDT · pe zero la 62.1806 (+10,4%)");
  assert.equal(m.randuri[1], "Riști încă 9,9 USDT până la stop, pentru 15,3 USDT recuperați dacă prețul se întoarce la margine · stopul atins în 24 h: ~44% (curba stopului)");
  assert.match(m.nota, /nu o prognoză/); assert.match(m.nota, /proba marginii/i);
});
await test("O2 întoarcerea de pe boții lui: treapta împlinită și orele la care se împlinesc următoarele două; cât i-ar lua unui grid nou să scoată pierderea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), m = c.CapMargine.textMut(c.CapMargine.alcatuieste(MUT));
  assert.equal(m.randuri[2], "Întoarcerea, pe boții tăi: după 3 ore afară, în 58 din 100 de cazuri prețul s-a întors în grid în următoarele 24 de ore (76 de episoade, ieșiri pe oricare parte a gridului) · la 10:33 se fac 6 ore: 40 din 100 · la 16:33 se fac 12 ore: 27 din 100");
  /* (revizia a doua) treapta care se împlinește mâine își spune ziua */
  const B48 = BANDA.map((r) => (r.h === 48 ? { ...r, n: 28 } : r)), maine = c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, afaraOre: 30, banda: B48 })).randuri[2];
  assert.match(maine, / · mâine la 01:57 se fac 48 de ore: 4 din 100$/); assert.equal(curat(c.CapMargine.trepte(c.CapMargine.alcatuieste({ ...MUT, afaraOre: 30, banda: B48 })))[1].et, "mâine la 01:57 · 48 de ore");
  assert.equal(m.randuri[3], "Un grid nou ar trebui să scoată 22,9 USDT ca să fii pe zero: la ritmul botului de acum (4,4 USDT pe zi cât a stat în grid) ≈ 5 zile de grile, cu prețul rămas în gridul nou");
  /* sub o oră afară nu e nicio treaptă împlinită: se spune doar ce urmează */
  const devreme = c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, afaraOre: 0.5 })).randuri[2];
  assert.equal(devreme, "Întoarcerea, pe boții tăi: la 08:27 se face o oră afară: 70 din 100 · la 10:27 se fac 3 ore: 58 din 100");
  /* treapta de 48 de ore are doar 12 episoade: nu se anunță ca „următoarea” */
  const tarziu = c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, afaraOre: 30 })).randuri[2];
  assert.equal(tarziu, "Întoarcerea, pe boții tăi: după 24 de ore afară, în 9 din 100 de cazuri prețul s-a întors în grid în următoarele 24 de ore (33 de episoade, ieșiri pe oricare parte a gridului)");
  /* fără jurnalul benzii și fără ritm măsurat, rândurile lor lipsesc - nimic inventat */
  const sarac = c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, banda: null, stopDrum: null, mut: { ...MUT.mut, perechi: 2 } }));
  assert.equal(sarac.randuri.length, 2); assert.doesNotMatch(sarac.randuri.join(" "), /Întoarcerea|grid nou|curba stopului/);
});
await test("O3 blocul apare doar afară din grid contra botului, pe minus și cu cifra închiderii știută; fără stop nu scrie riscul până la stop", () => {
  const c = module_("text-ro.js", "cap-margine.js"), T = (o) => c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, ...o }));
  assert.equal(T({ pret: 60.567, afaraOre: null }), null, "în grid"); assert.equal(T({ mut: null }), null); assert.equal(T({ mut: { ...MUT.mut, iei: 95 } }), null, "pe plus nu e nicio pierdere de încasat");
  const fs0 = T({ stop: null, stopActiv: false, laStop: null, stopDrum: null });
  assert.equal(fs0.randuri[0], "Dacă rămâi: fără stop pus · la marginea de jos (60.0000, +6,5%): −7,5 USDT · pe zero la 62.1806 (+10,4%)"); assert.doesNotMatch(fs0.randuri.join(" "), /Riști încă/);
  assert.match(T({ laStop: null, stopDrum: null }).randuri[0], /^Dacă rămâi: la stopul tău \(54\.0000\): totalul nu se poate socoti · /, "(revizia a doua) stop cu preț, fără total: nu „fără stop pus”");
  const a = cuTablou(citeste("public", "app.js")), pz = citeste("public", "lib", "asezare-paznic.js");
  assert.match(a, /mut:\(function\(\)\{try\{var q=TabloExtra\.dacaInchizi\(b\)/); assert.match(a, /oreInGrid:pl0>0\?Math\.max\(0,\(Date\.now\(\)-pl0\)\/3600000-\(afO\|\|0\)\):null/);
  assert.match(pz, /<details class="pzMut"/); assert.match(pz, /localStorage\.getItem\("pzMutDeschis"\) !== "0"/); assert.match(pz, /localStorage\.setItem\("pzMutDeschis", t\.open \? "1" : "0"\)/);
});

// ---------- P. gridul mutat la același bot (el l-a mutat pe 21.11: 60–66 ⇒ 54–61) ----------
await test("P1 trecerea se judecă față de marginile din CLIPA punctului: un bot al cărui grid a fost mutat în jos după trecere rămâne episod", () => {
  /* long 90–110; la minutul 30 prețul cade la 89 (sub 90); la minutul 60 gridul e mutat la 80–95 (arhiva ține doar gridul de la închidere) */
  const x = botA({ id: 31, creat: ZI0, final: -20 }); x.buOrderData.bottom = 80; x.buOrderData.top = 95;
  const L = drum(ZI0, (m) => (m < 30 ? [95, -2] : [89, -9]), 120).map((q, k) => ({ ...q, gridJos: k < 60 ? 90 : 80, gridSus: k < 60 ? 110 : 95 }));
  const e = PM.episod(x, L); assert.equal(e.t0, ZI0 + 30 * MIN, "față de gridul de la închidere (80–95) n-ar fi trecut niciodată"); assert.equal(e.mutat, true);
  assert.equal(e.dupa[1].inGrid, true, "la o oră după, prețul 89 e în gridul mutat (80–95)");
  /* fără margini pe puncte (drumurile vechi): judecat față de gridul de la închidere, ca până acum */
  assert.equal(PM.episod(x, L.map(({ gridJos, gridSus, ...q }) => q)).fara, "in-grid"); assert.equal(PM.episod(botA({ id: 32, creat: ZI0, final: -20 }), drum(ZI0, (m) => (m < 30 ? [95, -2] : [89, -9]), 120)).mutat, false);
  /* invers: gridul mutat în SUS peste preț nu inventează o trecere înaintea mutării */
  const y = botA({ id: 33, creat: ZI0, final: 1 }); y.buOrderData.bottom = 96; y.buOrderData.top = 120;
  const Ly = drum(ZI0, () => [95, 1], 120).map((q, k) => ({ ...q, gridJos: k < 100 ? 90 : 96, gridSus: 120 }));
  assert.equal(PM.episod(y, Ly).fara, "mutat", "(revizia a doua) marginile s-au schimbat chiar la „trecere”: prețul n-a trecut nimic, botul nu intră");
  assert.equal(PM.notaVie(VIU, Ly, null).stare, "mutat", "nota de pe viu vede la fel"); assert.equal(PM.notaVie(VIU, Ly, null).iesire, null);
  assert.equal(PM.episodCuNota(botA({ id: 34, creat: ZI0, final: -5, min: 12 * 1440 }), drum(ZI0, () => [86, -25], 300, 9 * 1440), { viu: true, stare: "mutat", scanat: ZI0 + 9 * 1440 * MIN + 5 * MIN, p: [[ZI0, 95, -1, 0, 0]], iesire: null }).fara, "mutat");
});
await test("P2 drumul botului ține marginile de la fiecare clipă: colectorul le trimite, ruta le păstrează", async () => {
  assert.match(citeste("scripts", "colector.mjs"), /distantaLichidarePct: b\.distantaLichidarePct, gridJos: b\.gridJos, gridSus: b\.gridSus \} \}\);/);
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js"), H = { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.10", "content-type": "application/json" };
  const r = await m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=adauga", { method: "POST", headers: H, body: JSON.stringify({ bot: "41", intrare: { t: Date.now() - 1000, pretPerp: 55.9, profitTotal: -24.5, investit: 94.44, gridJos: 54, gridSus: 61 } }) }), env: ENV });
  assert.equal(r.status, 200); const pus = JSON.parse(kv.get("ist:41"))[0]; assert.equal(pus.gridJos, 54); assert.equal(pus.gridSus, 61); assert.equal(pus.pretPerp, 55.9);
});
await test("P3 rândul „Afară din grid de …” rămâne scurt când blocul „Dacă muți gridul acum” spune deja întoarcerea (aceeași frază nu apare de două ori)", () => {
  const c = module_("text-ro.js", "cap-margine.js"), k = c.CapMargine.alcatuieste(MUT);
  assert.equal(c.CapMargine.textAfara(k), "Afară din grid de 3 h 24 min"); assert.match(c.CapMargine.textMut(k).randuri[2], /după 3 ore afară, în 58 din 100/);
  assert.match(c.CapMargine.textAfara(c.CapMargine.alcatuieste({ ...MUT, mut: null })), /58 din 100 de cazuri/, "fără bloc, rândul își spune întoarcerea");
});

// ---------- Q. zero-ul botului, stopul pe margine, „ai mutat gridul” (botul lui după mutarea din 21.11: grid 54–61, stop 54, prețul 58,494) ----------
const MUTAT = { dir: "long", pret: 58.494, jos: 54, sus: 61, stop: 54, stopActiv: true, laMargine: (parte) => (parte === "jos" ? -35.5 : -12.4), laStop: -35.5, total: -15.2, sanse: { jos: { 24: f(0.59) } }, sansePret: 58.494, sanseOra: "08:45", pas: 0.006 };
await test("Q1 zero-ul botului e spus mereu în cap: prețul lui și distanța; când în grid nu se mai atinge, cu cât rămâi la marginea dinspre câștig", () => {
  const c = module_("text-ro.js", "cap-margine.js"), Z = (x) => c.CapMargine.textZero(c.CapMargine.alcatuieste(x));
  assert.equal(Z({ ...BAZA, zero: { pret: 62.1806, neatins: false } }), "Zero-ul botului: 62.1806 (+2,7% de aici)");
  assert.equal(Z({ ...MUTAT, zero: { pret: null, neatins: true } }), "Pe zero botul nu mai ajunge în gridul ăsta: la marginea de sus (61.0000, +4,3%) rămâi cu −12,4 USDT");
  assert.equal(Z({ ...MUTAT, dir: "short", pret: 56.5, stop: 61, zero: { pret: null, neatins: true }, laMargine: (parte) => (parte === "sus" ? -30 : -9.1), sanse: {} }), "Pe zero botul nu mai ajunge în gridul ăsta: la marginea de jos (54.0000, −4,4%) rămâi cu −9,1 USDT");
  assert.equal(Z({ ...MUTAT, zero: { pret: null, neatins: true }, laMargine: -35.5 }), "Pe zero botul nu mai ajunge în gridul ăsta", "fără totalul de la marginea cealaltă: doar faptul");
  assert.equal(Z({ ...BAZA }), ""); assert.equal(Z({ ...BAZA, zero: { pret: null, neatins: false } }), "", "fără zero socotit nu se inventează nimic");
  /* blocul „Dacă muți gridul acum” nu tace nici el */
  const m = c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, zero: { pret: null, neatins: true }, mut: { ...MUT.mut, pretZero: null } }));
  assert.match(m.randuri[0], / · pe zero nu se mai ajunge în gridul ăsta$/);
});
await test("Q2 I-913 stopul chiar pe marginea gridului: prima atingere închide botul - cu totalul de acolo și șansa marginii; departe de margine, nimic", () => {
  const c = module_("text-ro.js", "cap-margine.js"), S = (x) => c.CapMargine.textStopMargine(c.CapMargine.alcatuieste(x));
  assert.equal(S(MUTAT), "Stopul tău e chiar pe marginea de jos: prima atingere a marginii închide botul la −35,5 USDT · o atinge în 24 h în 59 din 100 de cazuri");
  assert.equal(S({ ...MUTAT, stop: 53.8 }), "", "(revizia a doua) la 0,4% de margine nu e „pe margine”, oricât de mare e pasul gridului");
  const ex = c.CapMargine.alcatuieste({ ...BAZA, stop: 59.52, laStop: -11.5, pas: 0.01 });
  assert.equal(c.CapMargine.textStopMargine(ex), "", "stop cu 0,8% sub margine, pas 1%"); assert.equal(c.CapMargine.textIntre(ex), "între margine și stopul tău mai pierzi 3,4 USDT (stopul e cu 0,8% sub margine)");
  assert.equal(S({ ...MUTAT, pret: 53.9 }), "", "afară din grid nu se mai spune „prima atingere”");
  assert.equal(S({ ...MUTAT, stop: 53.5 }), "", "la 0,9% de margine nu mai e „pe margine”"); assert.equal(S({ ...MUTAT, stop: null, stopActiv: false, laStop: null }), "");
  assert.equal(S({ ...MUTAT, sanse: {} }), "Stopul tău e chiar pe marginea de jos: prima atingere a marginii închide botul la −35,5 USDT", "fără cifra marginii rămâne faptul");
  assert.equal(S({ ...MUTAT, pas: null, stop: 53.95 }), "Stopul tău e chiar pe marginea de jos: prima atingere a marginii închide botul la −35,5 USDT · o atinge în 24 h în 59 din 100 de cazuri", "fără pasul gridului: la cel mult 0,2% de margine");
  assert.equal(S({ ...MUTAT, pas: null, stop: 53.8 }), "");
  assert.equal(c.CapMargine.textIntre(c.CapMargine.alcatuieste(MUTAT)), "", "rândul „între margine și stop” nu se scrie: nu e niciun loc între ele");
});
await test("Q3 dovada stopului pe margine, de pe boții lui: dintre cei închiși dincolo de margine cu stop pus, câți îl aveau la cel mult 0,5% de ea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), B = [];
  /* 40 de boți long 90–110 cu stop, închiși sub 90: 25 cu stopul la 89,8 (0,2% sub margine), −10 fiecare; 15 cu stopul la 85, −30 fiecare; + 10 în grid */
  for (let i = 0; i < 40; i++) { const x = bot({ id: i, real: i < 25 ? -10 : -30, pi: 88, stop: i < 25 ? 89.8 : 85 }); B.push(x); }
  for (let i = 0; i < 10; i++) B.push(bot({ id: 100 + i, real: 1, pi: 100, stop: 89.8 }));
  const d = c.CapMargine.dinBoti(B); assert.equal(d.stop.cu.afara.n, 40); assert.equal(d.stop.cu.laMargine.n, 25); assert.equal(d.stop.cu.laMargine.net, -250);
  assert.equal(c.CapMargine.textDovadaStopMargine(d), "Pe boții tăi închiși dincolo de margine cu stop pus (40 de boți): 25 aveau stopul chiar pe margine (la cel mult 0,5% de ea) și au făcut −250,0 USDT. Așa au ieșit, nu ce urmează.");
  assert.equal(c.CapMargine.textDovadaStopMargine(c.CapMargine.dinBoti(B.slice(0, 20))), "", "sub 30 de boți nu se spune nimic");
  const k = c.CapMargine.alcatuieste({ ...MUTAT, dovada: d }); assert.match(k.stopMargine.dovada, /^Pe boții tăi închiși dincolo de margine cu stop pus/); assert.equal(c.CapMargine.alcatuieste({ ...MUTAT, stop: 50, dovada: d }).stopMargine, null);
});
await test("Q4 I-912 „ai mutat gridul”: ultima schimbare a marginilor din drumul botului (cu ora ei și totalul de atunci), doar cât e proaspătă (24 h)", () => {
  const c = module_("text-ro.js", "cap-margine.js"), T0q = new Date(2026, 10, 21, 8, 0, 0).getTime(), P = (m, j, s, tot) => ({ t: T0q + m * 60000, pretPerp: 56, profitTotal: tot, gridJos: j, gridSus: s });
  const I = [P(0, 60, 66, -22), P(5, 60, 66, -24.5), P(10, 54, 61, -24.6), P(15, 54, 61, -20)], mv = curat(c.CapMargine.mutareDin(I, T0q + 50 * 60000));
  assert.deepEqual(mv, { la: T0q + 10 * 60000, jos0: 60, sus0: 66, total0: -24.5 });
  assert.equal(c.CapMargine.textMutare(c.CapMargine.alcatuieste({ ...MUTAT, mutare: mv, acum: T0q + 50 * 60000 })), "Ai mutat gridul la 08:10: 60.0000–66.0000 → 54.0000–61.0000 (totalul era atunci −24,5 USDT)");
  assert.equal(c.CapMargine.mutareDin(I, T0q + 25 * 3600000), null, "după 24 de ore nu mai e știre"); assert.equal(c.CapMargine.mutareDin(I.slice(0, 2), T0q + 3600000), null, "fără nicio schimbare");
  assert.equal(c.CapMargine.mutareDin(I.map(({ gridJos, gridSus, ...q }) => q), T0q + 3600000), null, "drumurile vechi nu au marginile: nu se ghicește"); assert.equal(c.CapMargine.mutareDin(null, T0q), null);
  const doua = I.concat([P(20, 55, 62, -19)]); assert.equal(c.CapMargine.mutareDin(doua, T0q + 3600000).jos0, 54, "ultima mutare, nu prima");
  assert.equal(c.CapMargine.textMutare(c.CapMargine.alcatuieste({ ...MUTAT })), "");
});
await test("Q5 legarea: pagina dă capului zero-ul, pasul gridului și mutarea; rândurile noi se desenează", () => {
  const a = cuTablou(citeste("public", "app.js")), pz = citeste("public", "lib", "asezare-paznic.js");
  assert.match(a, /zero:\(function\(\)\{try\{var q=TabloExtra\.dacaInchizi\(b\);return q\?\{pret:q\.pretZero,neatins:q\.zeroNeatins===true(?:,pretPoz:q\.pretZeroPozitie)?(?:,grile:tbZeroGrile\(b\))?\}:null\}/); assert.match(a, /SemnaleBot\.pasBot\(b\)/);
  assert.match(a, /CapMargine\.mutareDin\(s\.intrari,Date\.now\(\)\)/); assert.match(a, /String\(s\.bot\)===String\(b\.id\)/);
  for (const k of ["pzMargZero", "pzMargStopM", "pzMargMut"]) assert.ok(pz.includes(k), k);   /* v100.374 design: clasele stau acum lângă cele ale benzii */
  /* stopul chiar pe margine: plafonat la șansa marginii, ca stopul de dincolo de ea (același preț nu poate avea două cifre) */
  assert.match(a, /parte=dir==="long"&&gj>0&&s\.stop<=gj\?"jos":dir==="short"&&gs>0&&s\.stop>=gs\?"sus":null;/);
  /* „nimic pierdut”: „Deschide tot” deschide și pliurile noi (altfel tabelul intervalelor rămânea închis după el) */
  assert.match(a, /p\.querySelectorAll\("details\.tbPl,details\.tbVremeaLarg,details\.ctInCap,details\.pzMut"\),function\(d\)\{d\.open=!!deschis\}\)/);
});

// ---------- R. I-914 recuperarea pe gridul din fișă + alerta „ai mutat gridul” (el, 21.11: „fa idei”) ----------
const FISA = { jos: 54.1, sus: 61.9, grile: 20, levier: 3, profitGrila: 0.0026, treceriZi: 30, nu: false };
await test("R1 „Dacă muți gridul acum”: recuperarea socotită pe gridul din fișa de azi (perechile pe zi așteptate × câștigul pe grilă), ritmul botului vechi rămâne ca reper", () => {
  const c = module_("text-ro.js", "cap-margine.js"), T = (f, o) => c.CapMargine.textMut(c.CapMargine.alcatuieste({ ...MUT, ...o, mut: { ...MUT.mut, fisa: f } })).randuri;
  const r = T(FISA);
  /* 30 de perechi × 0,26% × (71,56 × 3 / 20) = 0,84 USDT pe zi ⇒ 22,88 / 0,84 = 27 de zile */
  assert.equal(r[3], "Cu gridul din fișa de azi (54.1000–61.9000, 21 de grile, 3×): ≈ 0,8 USDT pe zi din grile (~30 de perechi pe zi, așteptate din istoria monedei) ⇒ pierderea de 22,9 USDT s-ar scoate în ≈ 27 de zile, cu prețul rămas în el");
  assert.match(r[4], /^Un grid nou ar trebui să scoată 22,9 USDT ca să fii pe zero: la ritmul botului de acum/, "ritmul botului vechi rămâne, ca reper");
  assert.equal(T({ ...FISA, nu: true })[3], "Fișa de azi zice să nu pornești un grid pe moneda asta: n-am socotit recuperarea pe gridul ei");
  assert.match(T({ ...FISA, treceriZi: 3 })[3], /⇒ pierderea de 22,9 USDT s-ar scoate în ≈ peste 30 de zile, cu prețul rămas în el$/);
  assert.equal(T(null).length, 4, "fără fișă: ca înainte"); assert.equal(T({ ...FISA, treceriZi: null }).length, 4, "fișa fără perechile pe zi nu scrie rândul");
  assert.equal(T({ ...FISA, profitGrila: 0 }).length, 4);
});
await test("R2 alerta „ai mutat gridul”: ce era, cât pierzi acum la marginea contra, stopul rămas pe ea, zero-ul care nu se mai atinge - titlu ≤ 60, rânduri ≤ 160", async () => {
  const M = await import("./lib/mesaje-colector.mjs");
  const m = M.gridMutat({ nume: "HYPE", jos0: 60, sus0: 66, jos: 54, sus: 61, parte: "jos", laMargine: -35.1, stopPeMargine: true, zeroNeatins: true, laMargineaLui: -12.3 });
  assert.equal(m.nivel, "atentie"); assert.equal(m.titlu, "HYPE: ai mutat gridul la 54–61");
  assert.equal(m.mesaj, "Era 60–66. La marginea de jos pierzi acum −35,1 USDT; stopul e chiar pe ea. Pe zero nu mai ajunge în grid (sus rămâi cu −12,3 USDT).\n👉 M-aș uita la stop: e pe margine, deci marginea atinsă înseamnă bot închis.");
  assert.ok(m.titlu.length <= 60); for (const r of m.mesaj.split("\n")) assert.ok(r.length <= 160, r.length + ": " + r);
  const simplu = M.gridMutat({ nume: "XMR", jos0: 300, sus0: 330, jos: 310, sus: 345, parte: "sus", laMargine: -4, stopPeMargine: false, zeroNeatins: false });
  assert.equal(simplu.mesaj, "Era 300–330. La marginea de sus pierzi acum −4,0 USDT.\n👉 M-aș uita în Tabloul botului la cifrele gridului nou.");
  assert.equal(M.gridMutat({ nume: "X", jos0: 1, sus0: 2, jos: 1.5, sus: 2.5, parte: null, laMargine: -5, stopPeMargine: true, zeroNeatins: true }).mesaj, "Era 1–2.\n👉 M-aș uita în Tabloul botului la cifrele gridului nou.", "botul neutru: doar faptul, chiar dacă vin cifre de margine");
  assert.equal(M.gridMutat({ nume: "X", jos0: 1, sus0: 2, jos: 1, sus: 2, parte: "jos" }), null, "aceleași margini: nicio alertă");
  assert.match(M.gridMutat({ nume: "X", jos0: 1, sus0: 2, jos: 1.5, sus: 2.5, parte: "jos", laMargine: 3.2 }).mesaj, /^Era 1–2\. La marginea de jos rămâi cu \+3,2 USDT\./, "(revizia a doua) pe plus nu „pierzi”");
});
await test("R3 colectorul: ține minte gridul fiecărui bot și trimite alerta o dată, la mutare; pagina dă blocului fișa botului", () => {
  const c = citeste("scripts", "colector.mjs"), a = cuTablou(citeste("public", "app.js"));
  assert.match(c, /if \(st\._grid && st\._grid !== gA\) \{ try \{ const mg = gridMutatDinBot\(b, st\._grid\); if \(mg\) await trimiteAlerta\(mg, b\.id, "grid-mutat-" \+ gA\.replace\(\/\[\^0-9\.\]\+\/g, "-"\)\); \}/, "(revizia a doua) cheia poartă gridul nou");
  assert.match(c, /Math\.abs\(s - niv\) \/ niv <= 0\.002,/); assert.match(c, /st\._grid = gA;/);
  assert.match(c, /MesajeColector\.gridMutat\(\{/); assert.match(c, /TabloExtra\.dacaInchizi\(b\)/);
  assert.match(a, /fF=typeof tbFisa!=="undefined"&&tbFisa&&tbFisa\.botId===b\.id\?tbFisa\.fisa:null;/, "doar fișa botului de pe ecran");
  assert.match(a, /fisa:fF&&fF\.setare\?\{jos:fF\.setare\.jos,sus:fF\.setare\.sus,grile:fF\.setare\.grile,levier:fF\.setare\.levier,profitGrila:fF\.setare\.profitGrila,treceriZi:fF\.treceriZi,nu:!!\(fF\.verdict&&fF\.verdict\.nivel==="nu"\)\}:null/);
});

// ---------- S. designul capului: banda de cifre și barele șanselor (el, 21.11: „optimizează vizual pagina botului”) ----------
await test("S1 banda de cifre: poziția, 1% contra, la margine, la stop, zero-ul - fiecare cu eticheta, cifra mare și rândul mic de sub ea", () => {
  const c = module_("text-ro.js", "cap-margine.js"), P = (x) => curat(c.CapMargine.placi(c.CapMargine.alcatuieste(x)));
  const p = P({ ...BAZA, expunere: { pozitie: 4.157, investit: 94.44, grile: 1.33, perechi: 55, varstaOre: 6.3 }, zero: { pret: 62.1806 } });
  assert.deepEqual(p.map((q) => q.k), ["poz", "unu", "margine", "stop", "zero"]);
  assert.deepEqual(p[0], { k: "poz", et: "Poziția", val: "251,8 USDT", sub: "long · levier efectiv 2,7×" });
  assert.deepEqual(p[1], { k: "unu", et: "1% contra", val: "−2,5 USDT", sub: "= 12 ore de grile, la ritmul de până acum" });
  assert.deepEqual(p[2], { k: "margine", et: "La marginea de jos", val: "−8,1 USDT", sub: "totalul botului la 60.0000" });
  assert.deepEqual(p[3], { k: "stop", et: "La stopul tău", val: "−24,9 USDT", sub: "56.0000 · 6,7% sub margine" });
  assert.deepEqual(p[4], { k: "zero", et: "Zero-ul botului", val: "62.1806", sub: "+2,7% de aici" });
});
await test("S2 banda la capete: afară din grid, stopul pe margine, fără stop, zero-ul care nu se mai atinge, botul neutru", () => {
  const c = module_("text-ro.js", "cap-margine.js"), P = (x) => curat(c.CapMargine.placi(c.CapMargine.alcatuieste(x))), una = (x, k) => P(x).find((q) => q.k === k);
  assert.deepEqual(una({ ...AFARA, afaraOre: 3.7 }, "margine"), { k: "margine", et: "Marginea de jos", val: "trecută cu 5,4%", sub: "60.0000 · afară de 3 h 42 min", ton: "rau" });
  assert.deepEqual(una({ ...AFARA, expunere: { pozitie: 4.2, investit: 94.44 } }, "unu"), { k: "unu", et: "1% contra", val: "−2,4 USDT", sub: "afară din grid nu se mai fac grile" });
  assert.deepEqual(una(MUTAT, "stop"), { k: "stop", et: "La stopul tău", val: "−35,5 USDT", sub: "54.0000 · chiar pe margine", ton: "atentie" });
  assert.equal(una({ ...BAZA, expunere: { pozitie: 4.157, investit: 94.44, grile: 0.0004, perechi: 6, varstaOre: 30 } }, "unu").sub, "= peste 30 de zile de grile, la ritmul de până acum", "nu „7.868 de zile”");
  assert.deepEqual(una({ ...BAZA, laStop: null }, "stop"), { k: "stop", et: "Stopul tău", val: "56.0000", sub: "totalul de acolo nu se poate socoti" }, "(revizia a doua) stop cu preț, fără total");
  assert.equal(c.CapMargine.textExpunere(c.CapMargine.alcatuieste({ ...BAZA, expunere: { pozitie: 4.157, investit: 94.44, grile: 2.52, perechi: 55, varstaOre: 1 } })).split(" USDT ").pop(), "= 1 oră de grile la ritmul de până acum", "59,9 minute nu se scriu „60 de minute”");
  assert.deepEqual(una({ ...MUTAT, zero: { pret: null, neatins: true } }, "zero"), { k: "zero", et: "Zero-ul botului", val: "nu se mai atinge", sub: "la marginea de sus rămâi cu −12,4 USDT", ton: "atentie" });
  assert.deepEqual(una({ ...BAZA, stop: null, stopActiv: false, laStop: null }, "stop"), { k: "stop", et: "Stopul", val: "fără stop", sub: "pierderea n-are capăt până la lichidare", ton: "rau" });
  assert.deepEqual(una({ ...BAZA, stop: null, stopActiv: true, stopEticheta: "stop −5%", laStop: null }, "stop"), { k: "stop", et: "Stopul", val: "stop −5%", sub: "fără preț socotit" });
  assert.equal(una({ dir: "neutral", pret: 100, jos: 95, sus: 106, expunere: { pozitie: -1.2, investit: 100 }, sanse: {} }, "poz").sub, "short acum · levier efectiv 1,2× · bot neutru: partea se schimbă cu prețul");
  assert.equal(una({ ...BAZA, stop: 60.2, laStop: -6 }, "stop").sub, "60.2000 · în grid", "stopul din grid nu e „sub margine”");
  assert.deepEqual(P(BAZA).map((q) => q.k), ["margine", "stop"], "fără poziție și fără zero socotit: doar ce se știe"); assert.deepEqual(curat(c.CapMargine.placi(null)), []);
});
await test("S3 barele șanselor: marginea (1 h / 4 h / 24 h) și stopul pe aceeași scară 0–100, cu cifra scrisă ca pe cardul ei; cifrele „de refăcut” nu se desenează", () => {
  const c = module_("text-ro.js", "cap-margine.js"), M = (x) => curat(c.CapMargine.metri(c.CapMargine.alcatuieste(x)));
  const m = M({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.003 }, { ore: 4, pStop: 0.048 }, { ore: 24, pStop: 0.3 }], stopDrum: 0.42 });
  assert.deepEqual(m[0], { k: "margine", et: "Atinge marginea, din 100", sursa: "istoria monedei, socotit la 22:52 · amănuntele în Probabilități", bare: [{ et: "1 h", p: 0.29, text: "29" }, { et: "4 h", p: 0.55, text: "55" }, { et: "24 h", p: 0.66, text: "66" }] });
  /* v100.384 (I-933): și fără take-profit rândul stopului e al simulării pe toate trei orizonturile; curba stopului rămâne reperul numit al pieței */
  assert.deepEqual(m[1].bare.map((q) => [q.et, q.p]), [["1 h", 0.003], ["4 h", 0.048], ["24 h", 0.3]]); assert.match(m[1].sursa, /^Monte Carlo pe botul tău: botul iese pe stop · .+ · reper: prețul ajunge la nivelul stopului în 24 h: ~42% \(curba stopului, piața\)$/);
  /* o cifră „de refăcut” ⇒ marginea rămâne pe propoziția ei (care spune ce se reface), nu pe bare */
  const vechi = M({ ...BAZA, pret: 60.975, sansePret: 60.79, sanse: { jos: { 1: f(0.12), 4: f(0.55), 24: f(0.72) } } }); assert.equal(vechi.some((q) => q.k === "margine"), false);
  assert.deepEqual(M({ ...BAZA, stopDrum: 0.004 })[1], { k: "stop", et: "Atinge stopul", sursa: "curba stopului, ca pe Drum", bare: [{ et: "24 h", p: 0.004, text: "< 1%" }] });
  assert.equal(M({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.0002 }] })[1].bare[0].text, "sub 0,1%"); assert.equal(M({ ...BAZA, stopScurt: [{ ore: 1, pStop: 0.0002 }] })[1].sursa, "Monte Carlo pe botul tău");
  assert.deepEqual(M({ ...AFARA }), [], "afară din grid, fără cifre de stop: nicio bară"); assert.deepEqual(curat(c.CapMargine.metri(null)), []);
});
await test("S4 treptele întoarcerii din blocul „Dacă muți gridul acum”: treapta împlinită și următoarele, cu ora lor", () => {
  const c = module_("text-ro.js", "cap-margine.js"), t = curat(c.CapMargine.trepte(c.CapMargine.alcatuieste(MUT)));
  assert.deepEqual(t, [{ et: "după 3 ore afară", val: "58 din 100", sub: "76 de episoade", p: 0.5789, acum: true }, { et: "la 10:33 · 6 ore", val: "40 din 100", sub: "55 de episoade", p: 0.4 }, { et: "la 16:33 · 12 ore", val: "27 din 100", sub: "44 de episoade", p: 0.2727 }]);
  assert.deepEqual(curat(c.CapMargine.trepte(c.CapMargine.alcatuieste({ ...MUT, banda: null }))), []); assert.deepEqual(curat(c.CapMargine.trepte(c.CapMargine.alcatuieste(BAZA))), []);
});
await test("S5 pagina: capul desenează banda și barele (cu <progress>, fără stiluri în linie), păstrează rândurile care nu încap în ele și nu repetă ce spune banda", () => {
  const pz = citeste("public", "lib", "asezare-paznic.js"), css = citeste("public", "app.css"), i = css.indexOf("/* v100.374 design"), j = css.indexOf("/* v100.374 (");
  assert.match(pz, /CapMargine\.placi\(cap\)/); assert.match(pz, /CapMargine\.metri\(cap\)/); assert.match(pz, /CapMargine\.trepte\(cap\)/);
  assert.match(pz, /<progress max="100" value="/); assert.doesNotMatch(pz.slice(pz.indexOf("CapMargine.placi(cap)"), pz.indexOf("var V = voci()")), /style="/, "fără stiluri în linie");
  for (const k of ["pzLedger", "pzLg", "pzMetru", "pzBara", "pzTrepte", "pzMargExp", "pzMargSanse", "pzMargZero", "pzMargStopM", "pzMargIntre", "pzMargMut", "pzMargAfara", "pzMargFaraStop", "pzMut"]) assert.ok(pz.includes(k), k + " lipsește din cap");
  assert.ok(i > 0 && i < j, "blocul de design stă înaintea blocului v100.374"); const bloc = css.slice(i, j);
  for (const k of [".pzLedger", ".pzLg", ".pzMetru", ".pzBara", ".pzTrepte", "progress"]) assert.ok(bloc.includes(k), k);
  assert.match(bloc, /:has\(>#ctAcum:not\(\[hidden\]\) \.ctGol\)>:is\(#pzVerdict,\.tbSus,#pzDrumCard\)\{grid-column:1 \/ -1!important\}/, "fără rânduri în „Contează acum”, capul ia toată lățimea"); assert.doesNotMatch(bloc, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, "culoare scrisă direct"); assert.match(bloc, /@media \(max-width:550px\)/);
});

// ---------- K. legarea în pagină + versiunea ----------
await test("K1 pagina: capul primește expunerea, totalul și cifra Drumului; Consilierul - „afară din grid”, dovada și cifra capului; „Contează acum” - marginea din cap", () => {
  const a = cuTablou(citeste("public", "app.js")), p = citeste("public", "lib", "asezare-paznic.js");
  assert.match(a, /expunere:\{pozitie:botiNr\(b\.pozitie\),investit:botiNr\(b\.investit\),grile:botiNr\(b\.gridProfitBrut\),perechi:botiNr\(b\.ordinePerechi\),varstaOre:/); assert.match(a, /total:botiNr\(b\.profitTotal\),stopDrum:sd0&&isFinite\(sd0\.p24\)\?sd0\.p24:null/);
  assert.match(a, /afaraContra:tbAfaraContra\(b\),total:botiNr\(b\.profitTotal\),dovadaFaraStop:tbDovadaFaraStop\(\),sanseMargine:tbSanseMargine\(b\)/);
  assert.match(a, /q\.ore===24&&!q\.vechi/, "titlul Consilierului nu ia o cifră „de refăcut”"); assert.match(a, /l=b\?tbConteazaLista\(b,typeof tbCapParte==="function"\?tbCapParte\(b\):null\):\[\]/);
  assert.match(citeste("public", "lib", "acasa-ecran.js"), /Conteaza\.acasa\(tbConteazaLista\(ctB\),/, "Acasă cere lista fără marginea din cap");
  assert.match(p, /window\.pzCapMargine = ctN;/); assert.match(p, /class="pzMargExp"/); assert.match(p, /class="pzMargIntre"/); assert.match(p, /pzMargFaraStop/); assert.match(p, /data-action-click="gridCopiaza\(this\.value\)" aria-label="Copiază prețul pentru /);
});
await test("K2 stilurile noi stau înaintea zonei păzite a temei și nu poartă culori scrise direct", () => {
  const css = citeste("public", "app.css"), i = css.indexOf("/* v100.374 ("), j = css.indexOf("/* v100.373 (");
  assert.ok(i > 0 && i < j && j < css.indexOf("/* v100.313"), "blocul v100.374 înaintea celui v100.373"); const bloc = css.slice(i, j);
  for (const k of [".pzMargExp", ".pzMargIntre", ".ctInCap", ".tbVremea", ".tbVremeaLarg"]) assert.ok(bloc.includes(k), k); assert.doesNotMatch(bloc, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, "culoare scrisă direct");
});
await test("K3 versiunea v100.374 e pusă peste tot și proba e în lanț, după v100.373", () => {
  const pk = JSON.parse(citeste("package.json")), idx = citeste("public", "index.html");
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 374, "package.json: de la 100.374 încolo"); assert.equal((idx.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 374).length >= 4, true, "index.html: v100.374 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 374, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 374, "versiune.js");
  assert.match(pk.scripts.test, /npm run test:v100373 && npm run test:v100374/); assert.equal(pk.scripts["test:v100374"], "node scripts/proba-v100374.mjs");
});

console.log(`\n${teste - picate} din ${teste} au trecut\n`);
process.exit(picate ? 1 : 0);
