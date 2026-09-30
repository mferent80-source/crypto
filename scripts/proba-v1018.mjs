// Proba v101.8 (30.09, el: „fă ideile”): cele 4 idei de dupa alerta „stopul fata de plan” (v101.7), pe botul REAL LIGHTER:
//   1) aceeasi alerta cand botul N-ARE stop activ in Pionex (lipsa sau stins) si ai plan pe minus
//   2) Tabloul, cartela „Stopul”: cat te costa stopul atins fata de plan (la LIGHTER eticheta era verde „pus”)
//   3) tinta din Pionex fata de planul pe plus (la LIGHTER: 5,112, peste grid; planul +5,5 atins la 02:07, neincasat)
//   4) gridul fata de plan si fata de miscarea obisnuita a monedei, cu levierul care se potriveste
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TabloExtra = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(GridCalcul);
const SemnaleBot = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(GridCalcul);
const Alerte = new Function(`${lib("alerte.js")}; return Alerte;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV101.8 · stop lipsa · cartela Stopul · tinta · gridul fata de plan · proba\n");

// Botul REAL 2390 la 29.09 13:34 UTC (vezi proba-v1017): 56 LIT la 4,484, grid geometric 16 x 7 LIT, stop 3,787, tinta 5,112
const LIGHTER = (o) => Object.assign({
  id: "2390", baza: "LIGHTER.PERP", directie: "long", levier: 5, investit: 103.38, activ: true,
  pozitie: 56, pretDeschidere: 4.484, pretCurent: 4.473, profitNet: -0.126, profitTotal: -0.74, pnlNerealizatSigur: true,
  gridJos: 4.085, gridSus: 4.837, pretLichidare: 3.49, distantaLichidarePct: 22.56,
  opritorPierdere: 3.787, opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdereRaport: null,
  opritorProfit: 5.112, opritorProfitActiv: true, opritorProfitTip: "pret", opritorProfitRaport: null,
  brut: { buOrderData: { row: 16, perVolume: "7", gridType: "geometric" } },
}, o || {});
const PLAN = { plus: 5.5, minus: 15.7, afaraOre: 12 };
const T0 = Date.UTC(2026, 8, 29, 13, 34);
// ca in colector: miscarea obisnuita (ctx.ampZi) intra si in planStare (stare.ampZi), pentru levierul potrivit
const ctxDin = (b, plan, extra) => Object.assign({ plan: TabloExtra.planStare(b, plan || PLAN, { ampZi: extra && extra.ampZi }, T0) }, extra || {});
const msg = (r, k) => r.mesaje.find((x) => x.cheie === k);

// ---------- 1) fara stop activ ----------
await test("1 · fara stop in Pionex + plan pe minus -> CRITIC: planul e doar alerta, unde sa-l pui, procentul din investitie", () => {
  const b = LIGHTER({ opritorPierdere: null, opritorPierdereActiv: false });
  const m = msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "plan-stop");
  assert.ok(m, "nu s-a trimis");
  assert.equal(m.nivel, "critic");
  assert.match(m.titlu, /^LIGHTER: n-ai stop activ în Pionex/);
  assert.match(m.titlu, /−15,7/);
  assert.match(m.mesaj, /4\.2601/);
  assert.match(m.mesaj, /−15,2% din investiție/);
  assert.match(m.mesaj, /lichidare/);
});

await test("1 · stop setat dar STINS -> aceeasi alerta, spune ca e setat si stins", () => {
  const b = LIGHTER({ opritorPierdereActiv: false });
  const m = msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "plan-stop");
  assert.ok(m && m.nivel === "critic", "nu s-a trimis critic");
  assert.match(m.mesaj, /setat la 3\.7870, dar e stins/);
});

await test("1 · cand vorbeste deja regula veche „opritorul e STINS si lichidarea e la X%” -> nu se dubleaza", () => {
  const b = LIGHTER({ opritorPierdereActiv: false, distantaLichidarePct: 12 });
  const r = Alerte.evalueaza(b, ctxDin(b), {}, T0);
  assert.ok(msg(r, "opritor"), "regula veche a disparut");
  assert.equal(msg(r, "plan-stop"), undefined);
});

await test("1 · fara plan pe minus -> tace", () => {
  const b = LIGHTER({ opritorPierdere: null, opritorPierdereActiv: false });
  assert.equal(msg(Alerte.evalueaza(b, ctxDin(b, { plus: 5.5 }), {}, T0), "plan-stop"), undefined);
});

// ---------- 3) tinta ----------
await test("3 · totalul pe urcare: gridul VINDE pe drum; peste marginea de sus botul n-are pozitie, totalul nu mai creste", () => {
  const b = LIGHTER();
  const sus = TabloExtra.totalCuGridLa(b, 4.837), peste = TabloExtra.totalCuGridLa(b, 5.112), tinut = TabloExtra.totalLaPret(b, 5.112);
  assert.ok(sus > 8 && sus < 10.5, `la marginea de sus ${sus}`);
  assert.ok(Math.abs(peste - sus) < 0.2, `peste grid ${peste} vs ${sus}`);
  assert.ok(tinut > 30, `totalLaPret tine pozitia intreaga (${tinut}) - de aia nu e bun pe urcare`);
});

await test("3 · oglinda LONG/SHORT si pe partea de castig (fara comision)", () => {
  const A = 4.5, o = (v) => 2 * A - v, L = LIGHTER();
  const S = LIGHTER({ directie: "short", pretDeschidere: o(L.pretDeschidere), pretCurent: o(L.pretCurent), gridJos: o(L.gridSus), gridSus: o(L.gridJos) });
  for (const x of [4.5, 4.6, 4.837, 5.112]) {
    const tl = TabloExtra.totalCuGridLa(L, x, 0), ts = TabloExtra.totalCuGridLa(S, o(x), 0);
    assert.ok(Math.abs(tl - ts) < 1e-9, `x ${x}: long ${tl} / short ${ts}`);
  }
  assert.ok(Math.abs(o(TabloExtra.pretTintaPentru(L, 5.5, 0)) - TabloExtra.pretTintaPentru(S, 5.5, 0)) < 1e-4);
});

await test("3 · pretTintaPentru(+5,5): in grid, dus-intors; ne-atins din pret in gridul asta (+20) -> null", () => {
  const b = LIGHTER(), x = TabloExtra.pretTintaPentru(b, 5.5);
  assert.ok(x > 4.473 && x < 4.837, `pret ${x}`);
  assert.ok(Math.abs(TabloExtra.totalCuGridLa(b, x) - 5.5) < 0.01);
  assert.equal(TabloExtra.pretTintaPentru(b, 20), null);
});

await test("3 · totalLaTinta: pe pret cu grilele de pe drum; in procente = raport x investit; stinsa -> null", () => {
  assert.ok(Math.abs(TabloExtra.totalLaTinta(LIGHTER()) - TabloExtra.totalCuGridLa(LIGHTER(), 5.112)) < 1e-9);
  assert.equal(Math.round(TabloExtra.totalLaTinta(LIGHTER({ opritorProfitTip: "raport", opritorProfitRaport: 0.05 })) * 1000), Math.round(0.05 * 103.38 * 1000));
  assert.equal(TabloExtra.totalLaTinta(LIGHTER({ opritorProfitActiv: false })), null);
});

await test("3 · LIGHTER: tinta din Pionex (5,112) departe de plan -> ATENTIE: unde se atinge planul, procentul, peste grid n-are pozitie", () => {
  const b = LIGHTER();
  const m = msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "plan-tinta");
  assert.ok(m, "nu s-a trimis");
  assert.equal(m.nivel, "atentie");
  assert.match(m.titlu, /^LIGHTER: ținta din Pionex/);
  assert.match(m.mesaj, /5\.1120/);
  assert.match(m.mesaj, /4\.6\d{3}/, "pretul planului");
  assert.match(m.mesaj, /\+5,3% din investiție/);
  assert.match(m.mesaj, /peste gridul de sus/);
  assert.match(m.mesaj, /Ce aș face eu:/);
});

await test("3 · fara tinta in Pionex + plan pe plus -> ATENTIE „n-ai tinta”; tinta pe masura planului -> tace", () => {
  const b = LIGHTER({ opritorProfit: null, opritorProfitActiv: false });
  const m = msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "plan-tinta");
  assert.ok(m && m.nivel === "atentie" && /n-ai țintă în Pionex/.test(m.titlu), JSON.stringify(m));
  const x = TabloExtra.pretTintaPentru(LIGHTER(), 5.5);
  const b2 = LIGHTER({ opritorProfit: x * 1.002 });
  assert.equal(msg(Alerte.evalueaza(b2, ctxDin(b2), {}, T0), "plan-tinta"), undefined);
});

await test("3 · tinta planului deja ATINSA -> tace (acolo vorbeste „tinta devine podea”); fara plan pe plus -> tace", () => {
  const b = LIGHTER({ profitTotal: 6 });
  assert.equal(msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "plan-tinta"), undefined);
  assert.equal(msg(Alerte.evalueaza(LIGHTER(), ctxDin(LIGHTER(), { minus: 15.7 }), {}, T0), "plan-tinta"), undefined);
});

// ---------- 4) gridul fata de plan ----------
// 4h: 40 de zile; ziua k are max-min = 8% + (k % 5)% din inchidere -> mediana 10%
const bare4h = () => { const out = [], z0 = Date.UTC(2026, 7, 20); for (let k = 0; k < 40; k++) for (let j = 0; j < 6; j++) { const c = 4, a = 0.08 + (k % 5) / 100; out.push({ t: z0 + k * 86400000 + j * 14400000, o: c, h: j === 1 ? c * (1 + a) : c, l: c, c }); } return out; };

await test("4 · miscareZi: mediana (max-min)/inchidere pe zilele INCHEIATE (ultimele 30); prea putine zile -> null", () => {
  const m = TabloExtra.miscareZi(bare4h(), Date.UTC(2026, 8, 29, 12));
  assert.ok(Math.abs(m - 0.10) < 1e-9, `${m}`);
  assert.equal(TabloExtra.miscareZi(bare4h().slice(0, 30), Date.UTC(2026, 8, 29, 12)), null);
  assert.equal(TabloExtra.miscareZi(null), null);
});

await test("4 · LIGHTER: gridul e mai larg decat planul -> ATENTIE: unde se atinge planul, marginea, levierul care incape (2x)", () => {
  const b = LIGHTER(), m = msg(Alerte.evalueaza(b, ctxDin(b, PLAN, { ampZi: 0.10 }), {}, T0), "grid-plan");
  assert.ok(m, "nu s-a trimis");
  assert.equal(m.nivel, "atentie");
  assert.match(m.titlu, /gridul e mai larg decât planul tău/);
  assert.match(m.mesaj, /4\.2601/);
  assert.match(m.mesaj, /4\.0850/);
  assert.match(m.mesaj, /levier 2×/);
  assert.match(m.mesaj, /10,0% pe zi/);
});

// acelasi LIGHTER, grid ingust cat planul (propunerea lui: jos acolo unde se atinge −17), levier 5x
const INGUST = () => LIGHTER({ gridJos: 4.27, gridSus: 4.70 });
await test("4 · grid ingust cat planul, la 5x, pe o moneda de 10%/zi -> ATENTIE: o zi obisnuita te scoate; levierul la care nu", () => {
  const b = INGUST(), pl = { plus: 5.5, minus: 17 };
  assert.ok(-TabloExtra.totalCuGridLa(b, 4.27) < 17 * 1.3, "gridul nu mai e mai larg decat planul");
  const m = msg(Alerte.evalueaza(b, ctxDin(b, pl, { ampZi: 0.10 }), {}, T0), "grid-plan");
  assert.ok(m, "nu s-a trimis");
  assert.match(m.titlu, /o mișcare mai mică decât o zi obișnuită/);
  assert.match(m.mesaj, /levier [1-4]×/);
});

await test("4 · gridul incape in plan si iesirea e dincolo de jumatate de zi obisnuita -> tace; fara miscareZi judeca doar latimea", () => {
  const b = LIGHTER();
  assert.equal(msg(Alerte.evalueaza(b, ctxDin(b, { minus: 40 }, { ampZi: 0.10 }), {}, T0), "grid-plan"), undefined);
  assert.equal(msg(Alerte.evalueaza(INGUST(), ctxDin(INGUST(), { minus: 17 }), {}, T0), "grid-plan"), undefined);
  assert.ok(msg(Alerte.evalueaza(b, ctxDin(b), {}, T0), "grid-plan"), "fara miscareZi, latimea tot se judeca");
});

await test("4 · pretul afara din grid / plan pe minus atins -> tace", () => {
  const b = LIGHTER({ pretCurent: 4.0 });
  assert.equal(msg(Alerte.evalueaza(b, ctxDin(b, PLAN, { ampZi: 0.10 }), {}, T0), "grid-plan"), undefined);
  const b2 = LIGHTER({ profitTotal: -16 });
  assert.equal(msg(Alerte.evalueaza(b2, ctxDin(b2, PLAN, { ampZi: 0.10 }), {}, T0), "grid-plan"), undefined);
});

await test("4 · se repeta cel mult o data pe zi", () => {
  const b = LIGHTER(), c = ctxDin(b, PLAN, { ampZi: 0.10 });
  const a = Alerte.evalueaza(b, c, {}, T0), d = Alerte.evalueaza(b, c, a.stare, T0 + 12 * 3600000), e = Alerte.evalueaza(b, c, d.stare, T0 + 24 * 3600000 + 1000);
  assert.equal(msg(d, "grid-plan"), undefined, "repetat dupa 12 h");
  assert.ok(msg(e, "grid-plan"), "nerepetat dupa 24 h");
});

// ---------- 2) cartela Stopul din Tablou ----------
const cartela = (b, plan) => SemnaleBot.acumConcret({ bot: b, fisa: null, zero: TabloExtra.dacaInchizi(b), costuri: null, plan: plan === undefined ? TabloExtra.planStare(b, PLAN, {}, T0) : plan, acum: T0 }).find((x) => x.cod === "stop");

await test("2 · LIGHTER: eticheta nu mai e verde „pus” — „peste plan”, cat costa atins, unde sa-l muti", () => {
  const s = cartela(LIGHTER());
  assert.equal(s.tag.t, "peste plan");
  assert.equal(s.tag.c, "bad");
  assert.match(s.mic, /atins ≈ −6\d USDT/);
  assert.match(s.act, /planul tău zice −15,7/);
  assert.match(s.act, /4\.2601/);
  assert.match(s.act, /−15,2% din investiție/);
});

await test("2 · stop pe masura planului -> ramane „pus”, cu costul la vedere; fara plan -> cartela de dinainte (fara cost)", () => {
  const b = LIGHTER({ opritorPierdere: 4.05 }), t = Math.ceil(-TabloExtra.totalLaOpritor(b));
  const s = cartela(b, TabloExtra.planStare(b, { minus: t }, {}, T0));
  assert.equal(s.tag.t, "pus");
  assert.match(s.mic, /atins ≈ −\d+ USDT/);
  const f = cartela(LIGHTER(), null);
  assert.equal(f.tag.t, "pus");
  assert.doesNotMatch(f.mic, /atins/);
});

await test("2 · fara stop, cu plan -> „fara protectie” si pretul planului", () => {
  const s = cartela(LIGHTER({ opritorPierdere: null, opritorPierdereActiv: false }));
  assert.equal(s.tag.t, "fără protecție");
  assert.match(s.act, /4\.2601/);
  assert.match(s.act, /−15,2% din investiție/);
});

await test("Tabloul da planul cartelei (app.js: acumConcret primeste plan)", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /SemnaleBot\.acumConcret\(\{[^}]*plan:plan[^}]*\}\)/);
});

await test("colectorul pune miscarea obisnuita pe zi in contextul botului (din lumanarile de 4 h pe care le are deja)", () => {
  const src = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(src, /ampZi\s*[:=][^;\n]*TabloExtra\.miscareZi\(/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
