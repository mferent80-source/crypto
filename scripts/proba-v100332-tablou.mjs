// Proba v100.332 · Tabloul botului (12.11.2026, el, după auditul paginii: „repară tot”). Testele au fost scrise ÎNTÂI și văzute picând pe v100.331.
//   🔴1 stopul propus în „Contează acum” (mut20): nu la / dincolo de lichidare (spus de ce), în grid cu grilele care mor, cu totalul de acolo;
//   🔴2 alertele critice depășite: regulile de acum cu planul, alerta mai nouă cu aceeași cheie o stinge pe cea veche, rândul urcat își poartă ora;
//   🟡1 cartela planului cu fraza semaforului · 🟡2 formularul planului pe bot · 🟡3 planul necitit ≠ „Nu ai un plan” · 🟡4 sfaturile înaintea
//   Consilierului (și golite la schimbarea botului) · 🟡5 lumânările de 5m / 30m ținute scurt + nota „lumânări de la HH:MM” · 🟡6 Range Filter
//   „CONTRA botului” · 🟡7 cheile localStorage ale boților dispăruți; (c) „Monte Carlo” o singură voce sub verdict; (d) frâna contului
//   necunoscută = „încă verific”; 🔵 virgula din „Banii botului”, „bara de acum” la short, opritorul viu în
//   scenarii; optimizarea: lumânările de 5 min ale măsurilor nu se mai cer la fiecare 8 s.
//   node scripts/proba-v100332-tablou.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const APP = citeste("public", "app.js");
// o funcție de la nivelul modulului din app.js (cu „async” dacă îl are), până la următoarea declarație de la capăt de rând
const fnDin = (src, nume) => {
  let i = src.indexOf("\nasync function " + nume + "("); if (i < 0) i = src.indexOf("\nfunction " + nume + "(");
  assert.ok(i >= 0, "lipsește funcția " + nume); i++;
  const cap = ["\nfunction ", "\nasync function ", "\nvar ", "\n//", "\n/*", "\ndocument.", "\nif(", "\nlet ", "\nconst "].map((t) => src.indexOf(t, i + 10)).filter((x) => x > 0);
  return src.slice(i, cap.length ? Math.min(...cap) : undefined);
};
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); }); }
console.log("\nV100.332 · Tabloul botului: reparațiile auditului din 12.11 · proba\n");

const ORA = 3600000, ACUM = Date.parse("2026-11-12T10:00:00Z");
const LIBS = ["text-ro.js", "grid-calcul.js", "scenariu.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "curba-stop.js", "conteaza.js", "pret-viu.js", "tablou-bot.js"];
const NUME = ["TextRo", "GridCalcul", "Scenariu", "TabloExtra", "Alerte", "SemnaleBot", "Sfaturi", "CurbaStop", "Conteaza", "PretViu", "TabloBot"];
// contextul paginii: modulele adevărate + ceasul pus la `acum` + ce mai dă chematorul; funcțiile din app.js se adaugă cu `pune`
function pagina(acum, extra) {
  const ceas = { t: acum };
  class DataFixa extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.t); } static now() { return ceas.t; } }
  const ctx = Object.assign({ console, Intl, Math, JSON, isFinite, Number, String, Array, Object, RegExp, isNaN, parseFloat, parseInt, Set, Map, Promise, setTimeout, clearTimeout, encodeURIComponent, Date: DataFixa }, extra || {});
  ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(LIBS.map(lib).join("\n;\n") + "\n" + NUME.map((n) => `this.${n} = typeof ${n} !== 'undefined' ? ${n} : null;`).join("\n"), ctx);
  ctx.escapeHtml = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const pune = (...nume) => { nume.forEach((n) => vm.runInContext(fnDin(APP, n), ctx)); return ctx; };
  return { ctx, ceas, pune };
}
// elemente false: fiecare id cerut există, cu câmpurile pe care le scrie pagina
function dom() { const el = {}; const $ = (id) => el[id] || (el[id] = { id, innerHTML: "", textContent: "", value: "", hidden: false, className: "", open: false, classList: { toggle() {}, contains() { return false; }, add() {}, remove() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, setAttribute() {}, getAttribute() { return null; } }); return { $, el }; }
// un bot normalizat ca în functions/api/bot-orders.js (aceleași formule), din câmpurile brute
function bot(o) {
  const dir = o.dir, long = dir === "long", short = dir === "short", investit = o.investit, profitNet = o.profitNet, pozitie = o.pozitie, pd = o.pretDeschidere, pret = o.pret;
  const pnl = long || short ? Math.abs(pozitie) * (pret - pd) * (long ? 1 : -1) : pozitie * (pret - pd), margine = investit + profitNet, total = margine + pnl - investit;
  const lichJos = o.lichJos ?? null, lichSus = o.lichSus ?? null, parti = [];
  let lich = { pretLichidare: null, lichidarePartea: null, distantaLichidarePct: null, lichidareDepasita: false };
  if (lichJos > 0) parti.push({ partea: "jos", pret: lichJos, dist: 100 * (pret - lichJos) / pret });
  if (lichSus > 0) parti.push({ partea: "sus", pret: lichSus, dist: 100 * (lichSus - pret) / pret });
  if (parti.length) { const p = parti.reduce((a, b) => (b.dist < a.dist ? b : a)); lich = { pretLichidare: p.pret, lichidarePartea: p.partea, distantaLichidarePct: Math.round(p.dist * 100) / 100, lichidareDepasita: p.dist < 0 }; }
  const brut = { strategyId: o.id || "b1", base: "TEST.PERP", quote: "USDT", createTime: o.pornitLa, buOrderData: { bottom: String(o.jos), top: String(o.sus), row: String(o.row), perVolume: String(o.perVolume), gridType: o.gridType || "arithmetic", trend: dir, position: String(pozitie), positionOpenPrice: String(pd), marginBalance: String(margine), initPrice: String(pret), leverage: String(o.levier) } };
  return Object.assign({ id: o.id || "b1", simbol: "TEST.PERP/USDT", baza: "TEST.PERP", quote: "USDT", activ: true, pornitLa: o.pornitLa, investit, margine, profitNet, pnlNerealizat: pnl, pnlNerealizatSigur: long || short ? true : false, profitTotal: total, levier: o.levier, directie: dir, pozitie, pretDeschidere: pd, pretCurent: pret,
    gridJos: o.jos, gridSus: o.sus, lichidareJos: lichJos, lichidareSus: lichSus, opritorProfit: o.tp ?? null, opritorProfitActiv: !!o.tp, opritorProfitTip: o.tp ? "pret" : null, opritorProfitRaport: null,
    opritorPierdere: o.stop ?? null, opritorPierdereActiv: !!o.stop || o.stopRaport != null, opritorPierdereTip: o.stopRaport != null ? "raport" : o.stop ? "pret" : null, opritorPierdereRaport: o.stopRaport ?? null, avertismente: [], brut }, lich);
}
const FIX = JSON.parse(citeste("scripts", "date", "curba-stop-fixtura.json"));
const BARE = FIX.seturi.map((s) => s.t.map((t, i) => ({ t, o: s.o[i], h: s.h[i], l: s.l[i], c: s.c[i] })));
const LONG10 = (x) => Object.assign({ dir: "long", levier: 10, investit: 100, profitNet: -0.5, pozitie: 6, pretDeschidere: 101, pret: 100, jos: 97, sus: 106, row: 31, perVolume: 0.3, stop: 96.5, lichJos: 89, pornitLa: FIX.acum - 5 * ORA }, x || {});
const LONG5_GRID = (x) => Object.assign({ dir: "long", levier: 5, investit: 100, profitNet: -0.5, pozitie: 3, pretDeschidere: 101, pret: 100, jos: 90, sus: 110, row: 41, perVolume: 0.15, stop: 98, lichJos: 86, pornitLa: FIX.acum - 5 * ORA }, x || {});

// ───────────── 🔴1. stopul propus ─────────────
await test("🔴1a. stopul propus la / dincolo de lichidare nu se mai propune (long): mut20 gol, cu motivul și prețul lichidării", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const b = bot(LONG10()), s = CurbaStop.pentruStop({ curba, atr: 2.5, pret: 100, stop: 96.5, dir: "long", acum: FIX.acum });
  assert.ok(s.mut20 !== null && s.mut20 <= 89, "premisa: curba propune dincolo de lichidare (" + s.mut20 + ")");
  assert.equal(typeof TabloExtra.stopPropus, "function", "TabloExtra.stopPropus lipsește");
  const r = TabloExtra.stopPropus(b, s);
  assert.equal(r.mut20, null); assert.equal(r.mutOprit, "lichidare"); assert.equal(r.mutLich, 89);
});
await test("🔴1b. „Contează acum”: fără prețul de dincolo de lichidare și fără „mult mai departe”; spune că acolo vine întâi lichidarea", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra, Conteaza } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const s0 = CurbaStop.pentruStop({ curba, atr: 2.5, pret: 100, stop: 96.5, dir: "long", acum: FIX.acum }), prop = Conteaza.pret(s0.mut20);
  const s = TabloExtra.stopPropus(bot(LONG10()), s0), rand = Conteaza.alege({ stop: s, sfaturi: [], lista: [], sanse: [] })[0];
  assert.ok(rand && rand.cheie === "stop", "rândul stopului rămâne (șansa măsurată a stopului de acum)");
  assert.ok(rand.faCe.indexOf(prop) < 0, "prețul propus dincolo de lichidare nu mai apare: " + rand.faCe);
  assert.doesNotMatch(rand.faCe, /mult mai departe|muți stopul/);
  assert.match(rand.faCe, /lichidarea \(89\.0000\)/);
  assert.match(rand.faCe, /^Hotărăște acum/);
});
await test("🔴1c. stopul propus în grid spune câte grile mor și totalul de acolo (o zecimală)", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra, Conteaza, TextRo } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const b = bot(LONG5_GRID()), s = TabloExtra.stopPropus(b, CurbaStop.pentruStop({ curba, atr: 1.0, pret: 100, stop: 98, dir: "long", acum: FIX.acum }));
  assert.ok(s.mut20 > 90 && s.mut20 < 110, "premisa: stopul propus cade în grid (" + s.mut20 + ")");
  const N = 40, k = Math.round((s.mut20 - 90) / 20 * N), t = TabloExtra.totalCuGridLa(b, s.mut20);
  assert.deepEqual(JSON.parse(JSON.stringify(s.mutGrile)), { moarte: k, intervale: N });
  assert.ok(Math.abs(s.mutTotal - t) < 1e-9);
  const rand = Conteaza.alege({ stop: s, sfaturi: [], lista: [], sanse: [] })[0];
  assert.ok(rand.faCe.indexOf("sub el nu mai lucrează " + k + " din " + TextRo.cate(N, "grilă", "grile")) > 0, rand.faCe);
  assert.ok(rand.faCe.indexOf("totalul acolo ≈ " + TextRo.usdt(t, 1)) > 0, rand.faCe);
  assert.ok(rand.faCe.indexOf("~" + Conteaza.pret(s.mut20)) > 0, "propunerea rămâne (Radarul avertizează, nu refuză)");
});
await test("🔴1d. short, în oglindă: dincolo de lichidarea de sus nu se propune; în grid „peste el nu mai lucrează …”", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra, Conteaza } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const o = { dir: "short", levier: 10, investit: 100, profitNet: -0.5, pozitie: -6, pretDeschidere: 99, pret: 100, jos: 94, sus: 103, row: 31, perVolume: 0.3, stop: 103.5, lichSus: 111, pornitLa: FIX.acum - 5 * ORA };
  const s = TabloExtra.stopPropus(bot(o), CurbaStop.pentruStop({ curba, atr: 2.5, pret: 100, stop: 103.5, dir: "short", acum: FIX.acum }));
  assert.equal(s.mut20, null); assert.equal(s.mutOprit, "lichidare"); assert.equal(s.mutLich, 111);
  const og = { dir: "short", levier: 5, investit: 100, profitNet: -0.5, pozitie: -3, pretDeschidere: 99, pret: 100, jos: 90, sus: 110, row: 41, perVolume: 0.15, stop: 102, lichSus: 114, pornitLa: FIX.acum - 5 * ORA };
  const sg = TabloExtra.stopPropus(bot(og), CurbaStop.pentruStop({ curba, atr: 1.0, pret: 100, stop: 102, dir: "short", acum: FIX.acum }));
  assert.ok(sg.mut20 > 100 && sg.mut20 < 110 && sg.mutGrile && sg.mutGrile.moarte >= 1, JSON.stringify(sg));
  assert.match(Conteaza.alege({ stop: sg, sfaturi: [], lista: [], sanse: [] })[0].faCe, /peste el nu mai lucrează \d+ din 40 de grile/);
});
await test("🔴1e. fără lichidare în drum și în afara gridului: propunerea rămâne, cu totalul de acolo; fără câmpurile noi textul e cel vechi", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra, Conteaza, TextRo } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const b = bot(LONG10({ lichJos: 80 })), s0 = CurbaStop.pentruStop({ curba, atr: 1.2, pret: 100, stop: 96.5, dir: "long", acum: FIX.acum }), vechi = Conteaza.alege({ stop: Object.assign({}, s0), sfaturi: [], lista: [], sanse: [] })[0].faCe;
  assert.equal(vechi, "Hotărăște acum: ori accepți ieșirea la 96.5000, ori muți stopul la ~" + Conteaza.pret(s0.mut20) + " (acolo ~20 din 100 într-o zi).");
  const s = TabloExtra.stopPropus(b, s0), t = TabloExtra.totalCuGridLa(b, s.mut20);
  assert.ok(s.mut20 < 97 && s.mut20 > 80 && !s.mutGrile && !s.mutOprit);
  assert.equal(Conteaza.alege({ stop: s, sfaturi: [], lista: [], sanse: [] })[0].faCe, "Hotărăște acum: ori accepți ieșirea la 96.5000, ori muți stopul la ~" + Conteaza.pret(s.mut20) + " (acolo ~20 din 100 într-o zi, totalul acolo ≈ " + TextRo.usdt(t, 1) + ").");
});
await test("🔴1f. pagina: tbStopSansa trece propunerea prin TabloExtra.stopPropus, iar butonul „copiază stopul propus” dispare", () => {
  const { ctx, pune } = pagina(FIX.acum), curba = ctx.CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas }), b = bot(LONG10());
  Object.assign(ctx, { tbStare: { bot: b, botBrut: b.brut }, tbProb: { botId: null }, tbCurbaPt: () => curba, tbProbPt: () => ({ rez: { atr1h: 2.5 }, cal: null }), tbProbVechi: () => null, pvPretViuAcum: () => null, tbVazAcum: () => false });
  pune("botiNr", "tbStopSansa", "tbCtOra", "tbCtUsdt", "tbCtBani", "tbCtCheie", "tbConteazaImbogateste");
  const s = ctx.tbStopSansa(b);
  assert.ok(s && s.mut20 === null && s.mutOprit === "lichidare", JSON.stringify(s));
  const l = ctx.Conteaza.alege({ stop: s, sfaturi: [], lista: [], sanse: [] }), imb = ctx.tbConteazaImbogateste(b, l);
  assert.ok(!(imb[0].butoane || []).some((q) => /stopul propus/.test(q.text)), "fără buton de copiere pentru un stop care nu se mai propune");
});

// ───────────── 🔴2. alertele critice depășite ─────────────
const BOT_PLAN = (x) => bot(Object.assign({ dir: "long", levier: 5, investit: 100, profitNet: -0.5, pozitie: 12, pretDeschidere: 10.2, pret: 10.0, jos: 9.5, sus: 10.8, row: 27, perVolume: 1, lichJos: 8.4, stop: 9.45, pornitLa: ACUM - 20 * ORA }, x || {}));
const A_STOP = { t: ACUM - 3 * ORA, bot: "b1", cheie: "plan-stop", nivel: "critic", titlu: "TEST: n-ai stop activ în Pionex (planul: −15 USDT)", mesaj: "Fără stop, o cădere bruscă merge până la lichidare.\n👉 Aș pune stopul la 9.4100: planul devine ordin, nu doar alertă." };
const A_PLAN = { t: ACUM - 9 * ORA, bot: "b1", cheie: "plan", nivel: "critic", titlu: "TEST: planul tău — pragul de −15 USDT e atins", mesaj: "Ai hotărât dinainte să închizi botul la −15 USDT.\n👉 Aș închide botul acum în Pionex, cum ai hotărât la rece." };
const lista = (ctx, b, alerte, plan) => {
  const { TabloExtra, Alerte, Sfaturi } = ctx, sf = Sfaturi.sfaturi(Sfaturi.intrare({ bot: b, acum: ACUM }));
  let l = TabloExtra.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, sfaturi: sf, avertismente: [], alerte: TabloExtra.alerteleBotului(alerte, "b1", ACUM), planGol: false });
  const st = plan ? TabloExtra.planStare(b, plan, { afaraDe: null }, ACUM) : null;
  return { sf, l: TabloExtra.marcheazaDepasite(l, { cons: { nivel: "tine", eticheta: "ȚINE" }, reguli: Alerte.reguli(b, st ? { plan: st } : null) }) };
};
const PLAN = { plus: 5, minus: 15, afaraOre: 12 };
await test("🔴2a. cu planul în reguli: „pragul de −15 e atins” (total acum −2,9) și „n-ai stop activ” (stop pus) ies din „Contează acum”", () => {
  const { ctx } = pagina(ACUM), b = BOT_PLAN(), r = lista(ctx, b, [A_STOP, A_PLAN], PLAN);
  assert.ok(Math.abs(b.profitTotal + 2.9) < 1e-9 && b.opritorPierdereActiv);
  const rosii = r.l.filter((x) => x.c === "r" && !x.depasit);
  assert.equal(rosii.length, 0, "rânduri roșii nedepășite: " + rosii.map((x) => x.titlu).join(" | "));
  assert.ok(r.l.filter((x) => x.depasit).length === 2, "cele două alerte rămân în listă, estompate");
  assert.equal(ctx.Conteaza.alege({ sfaturi: r.sf, lista: r.l, sanse: [] }).filter((x) => x.cheie === "alerta").length, 0);
});
await test("🔴2b. o alertă critică ÎNCĂ adevărată rămâne sus: planul atins (total −16,1) și botul fără stop", () => {
  const { ctx } = pagina(ACUM), b = BOT_PLAN({ profitNet: -13.7, stop: null }), r = lista(ctx, b, [A_STOP, A_PLAN], PLAN);
  assert.ok(b.profitTotal <= -15 && !b.opritorPierdereActiv, "premisa: total " + b.profitTotal);
  const ct = ctx.Conteaza.alege({ sfaturi: r.sf, lista: r.l, sanse: [] }).filter((x) => x.cheie === "alerta");
  assert.ok(ct.some((x) => /pragul de −15 USDT e atins/.test(x.titlu)), "planul atins rămâne în „Contează acum”: " + ct.map((x) => x.titlu).join(" | "));
  assert.ok(r.l.every((x) => !x.depasit), "nimic estompat");
});
await test("🔴2c. alerta mai nouă cu aceeași cheie o stinge pe cea veche (trecerea „info” sau alt fapt); același fel rămâne ×N", () => {
  const { ctx } = pagina(ACUM), { TabloExtra } = ctx, f = (al) => TabloExtra.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, sfaturi: [], avertismente: [], alerte: al, planGol: false });
  const trecut = { t: ACUM - 2 * ORA, bot: "b1", cheie: "plan-stop", nivel: "info", titlu: "TEST: stopul din Pionex se potrivește acum cu planul tău", mesaj: "Atins, te costă ≈ 14,0 USDT; planul zice −15." };
  let l = f([A_STOP, trecut]);
  assert.ok(!l.some((x) => /n-ai stop activ/.test(x.titlu)), "alerta critică de dinaintea trecerii nu mai e rând: " + l.map((x) => x.titlu).join(" | "));
  const altFapt = { t: ACUM - 1 * ORA, bot: "b1", cheie: "plan-stop", nivel: "atentie", titlu: "TEST: stopul din Pionex pierde ≈ 20 USDT (planul: −15)", mesaj: "Stopul e la 9.3000.\n👉 Aș muta stopul în Pionex la 9.4100." };
  l = f([A_STOP, altFapt]);
  assert.deepEqual(JSON.parse(JSON.stringify(l.filter((x) => x.cheie === "plan-stop").map((x) => x.titlu))), ["stopul din Pionex pierde ≈ 20 USDT (planul: −15)"]);
  const l1 = { t: ACUM - 3 * ORA, bot: "b1", cheie: "lich", nivel: "critic", titlu: "TEST: lichidarea la 6,2%", mesaj: "Mai sunt 6,2%." }, l2 = { t: ACUM - 1 * ORA, bot: "b1", cheie: "lich", nivel: "critic", titlu: "TEST: lichidarea la 5,1%", mesaj: "Mai sunt 5,1%." };
  l = f([l1, l2]);
  assert.equal(l.length, 1); assert.equal(l[0].n, 2); assert.equal(l[0].titlu, "lichidarea la 5,1%");
  const c1 = { t: ACUM - 90 * 60000, cheie: "colector", nivel: "atentie", titlu: "colectorul nu mai poate citi botul", mesaj: "" }, c2 = { t: ACUM - 30 * 60000, cheie: "colector", nivel: "atentie", titlu: "Busola n-a mai măsurat", mesaj: "" };
  assert.equal(f([c1, c2]).length, 2, "cheia comună „colector” nu stinge nimic");
  const lvechi = { t: ACUM - 5 * ORA, bot: "b1", cheie: "lich", nivel: "critic", titlu: "TEST: lichidarea la 6,2%", mesaj: "" }, lok = { t: ACUM - 4 * ORA, bot: "b1", cheie: "lich", nivel: "info", titlu: "TEST: lichidarea e din nou departe (18,0%)", mesaj: "" }, lnou = { t: ACUM - 1 * ORA, bot: "b1", cheie: "lich", nivel: "critic", titlu: "TEST: lichidarea la 7,0%", mesaj: "" };
  l = f([lvechi, lok, lnou]);
  assert.equal(l.length, 1); assert.equal(l[0].n, 1, "episodul de dinaintea trecerii nu se mai numără"); assert.equal(l[0].titlu, "lichidarea la 7,0%");
});
await test("🔴2d. rândul urcat din alertă își poartă ora („alertă de la HH:MM”)", () => {
  const { ctx } = pagina(ACUM), b = BOT_PLAN({ profitNet: -13.7 }), r = lista(ctx, b, [A_PLAN], PLAN);
  const rand = ctx.Conteaza.alege({ sfaturi: [], lista: r.l, sanse: [], acum: ACUM }).filter((x) => x.cheie === "alerta")[0];
  const d = new Date(A_PLAN.t), hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  assert.ok(rand, "rândul alertei");
  assert.ok(rand.sub.indexOf("alertă de la " + hm) === 0, rand.sub);
  assert.ok(text(ctx.Conteaza.html([rand], ctx.escapeHtml)).indexOf("alertă de la " + hm) > 0);
  const ieri = ctx.Conteaza.alege({ sfaturi: [], lista: [{ c: "r", titlu: "ceva roșu de ieri", text: "fapt 👉 fac", la: ACUM - 23 * ORA, ultima: ACUM - 23 * ORA }], sanse: [], acum: ACUM })[0], di = new Date(ACUM - 23 * ORA);
  if (di.toDateString() !== new Date(ACUM).toDateString()) assert.match(ieri.sub, /^alertă de la \d\d\.\d\d \d\d:\d\d · fapt$/);
  const sfat = ctx.Conteaza.alege({ sfaturi: [], lista: [{ c: "r", titlu: "rând roșu din sfat, socotit acum", text: "fapt 👉 fac", la: ACUM }], sanse: [], acum: ACUM })[0];
  assert.equal(sfat.sub, "fapt", "rândul care nu vine dintr-o alertă nu primește „alertă de la”");
});
await test("🔴2e. pagina: tbRenderTodo cere regulile de acum CU planul (tbPlanStareAcum) ⇒ rândul depășit e estompat și nu urcă", () => {
  const { ctx, pune } = pagina(ACUM), d = dom(), b = BOT_PLAN();
  Object.assign(ctx, { $: d.$, tbStare: { bot: b, routeOk: true, botLa: ACUM, sfaturiLista: [], alerteServer: [A_STOP, A_PLAN], avertLista: [], consUlt: { nivel: "tine", eticheta: "ȚINE" } }, tbPlan: { botId: "b1", plan: PLAN, la: ACUM - 60000 }, tbSem: { botId: null, v: null }, tbMinusAtins: {},
    tbTextFaraBot: () => "—", tbContTot: () => {}, tbEsteSus: () => false, tbRenderConteaza: () => [] });
  pune("tbRenderTodo", "botiNr"); try { pune("tbPlanCitire", "tbPlanStareAcum"); } catch (e) { /* pe codul vechi lipsesc: testul pică mai jos, pe purtare */ }
  ctx.tbRenderTodo();
  assert.ok(ctx.tbStare.todoLista.length >= 2);
  assert.ok(ctx.tbStare.todoLista.filter((x) => x.cheie === "plan" || x.cheie === "plan-stop").every((x) => x.depasit), JSON.stringify(ctx.tbStare.todoLista.map((x) => [x.cheie, x.depasit || null])));
  assert.match(d.el.tbTodoLista.innerHTML, /tbTodoDepasit/);
});

// ───────────── 🟡1. cartela planului = fraza semaforului ─────────────
await test("🟡1. cartela „Planul tău” ia fraza semaforului: ținta atinsă și la adăpost ⇒ „L-aș lăsa…”, nu „Aș închide botul acum”", () => {
  const { ctx, pune } = pagina(ACUM), d = dom(), { SemnaleBot, TabloExtra } = ctx;
  // long pe plus: totalul +6,7 peste ținta +5; stopul 10.55 e dincolo de podea
  const b = bot({ dir: "long", levier: 5, investit: 100, profitNet: 2.5, pozitie: 12, pretDeschidere: 10.2, pret: 10.55, jos: 9.5, sus: 10.8, row: 27, perVolume: 1, lichJos: 8.4, stop: 10.5, pornitLa: ACUM - 20 * ORA });
  const plan = { plus: 5, minus: 15 }, st = TabloExtra.planStare(b, plan, { afaraDe: null }, ACUM);
  assert.ok(st.atins.indexOf("plus") >= 0, "premisa: ținta atinsă (total " + b.profitTotal + ")");
  const sm = SemnaleBot.semafor({ bot: b, fisa: { regim: { miscare: false }, directie: null }, zero: TabloExtra.dacaInchizi(b), plan: st, costuri: null });
  assert.equal(sm.cod, "podea", "premisa: semaforul zice podea (" + JSON.stringify([sm.nivel, sm.cod, sm.motiv]) + ")");
  assert.equal(typeof SemnaleBot.planPeCartela, "function", "SemnaleBot.planPeCartela lipsește");
  const pc = SemnaleBot.planPeCartela(st, sm);
  assert.equal(pc.faCe, sm.faCe); assert.doesNotMatch(pc.faCe, /Aș închide botul acum/);
  // pragul de minus atins: fraza rămâne cea hotărâtă la rece (aceeași ca a semaforului)
  const bm = BOT_PLAN({ profitNet: -13.7 }), stm = TabloExtra.planStare(bm, plan, { afaraDe: null }, ACUM), smm = SemnaleBot.semafor({ bot: bm, fisa: null, zero: null, plan: stm });
  assert.equal(SemnaleBot.planPeCartela(stm, smm).faCe, "Aș închide botul acum, cum ai hotărât la rece.");
  assert.equal(SemnaleBot.planPeCartela(TabloExtra.planStare(BOT_PLAN(), plan, { afaraDe: null }, ACUM), null).faCe, null, "nimic atins ⇒ nicio frază");
  // pagina: cartela scrie fraza semaforului ținut minte la ultimul desen
  Object.assign(ctx, { $: d.$, tbStare: { bot: b, routeOk: true, semUlt: { bot: "b1", planLa: 7, sm } }, tbPlan: { botId: "b1", plan, la: 7 }, tbSapt: { botId: "b1", intrari: [], eroare: null }, tbProfil: { faraServer: true }, tbProfilPt: () => null, ProfilMoneda: { planPeMoneda: () => null }, tbRenderTodo: () => {}, grProc: (v) => String(v), botiNr: (v) => (v == null || v === "" ? null : Number(v)) });
  pune("tbDeseneazaSaptPlan"); try { pune("tbPlanCitire", "tbPlanFormSinc"); } catch (e) { /* codul vechi */ }
  ctx.tbDeseneazaSaptPlan(b);
  const h = text(d.el.tbPlanStare.innerHTML);
  assert.ok(h.indexOf(sm.faCe) > 0, h);
  assert.doesNotMatch(h, /Aș închide botul acum|atinsă: închide botul/);
});

// ───────────── 🟡2 + 🟡3. planul: formularul pe bot, „neadus” ≠ „fără plan” ─────────────
await test("🟡2. formularul planului e al botului de pe ecran: la alt bot câmpurile se rescriu (gol dacă n-are), tastatul pe același bot rămâne", () => {
  const { ctx, pune } = pagina(ACUM), d = dom();
  Object.assign(ctx, { $: d.$, tbStare: {}, tbPlan: { botId: "A", plan: { plus: 3, minus: 15, afaraOre: 12 }, la: 1 } });
  pune("tbPlanInForm", "tbPlanFormSinc");
  ctx.tbPlanFormSinc({ id: "A" });
  assert.deepEqual([d.el.tbPlanPlus.value, d.el.tbPlanMinus.value, d.el.tbPlanAfara.value], ["3", "15", "12"]);
  ctx.tbPlanFormSinc({ id: "B" });   // planul lui B încă n-a venit: câmpurile NU rămân cu cifrele lui A
  assert.deepEqual([d.el.tbPlanPlus.value, d.el.tbPlanMinus.value, d.el.tbPlanAfara.value], ["", "", ""]);
  ctx.tbPlan = { botId: "B", plan: { plus: 1, minus: 5 }, la: 2 }; ctx.tbPlanInForm();
  assert.deepEqual([d.el.tbPlanPlus.value, d.el.tbPlanMinus.value, d.el.tbPlanAfara.value], ["1", "5", ""]);
  d.el.tbPlanPlus.value = "2,5"; ctx.tbPlanFormSinc({ id: "B" }); ctx.tbPlanInForm();
  assert.equal(d.el.tbPlanPlus.value, "2,5", "ce tastezi pe același bot nu se suprascrie");
  ctx.tbPlan = { botId: "A", plan: { plus: 3, minus: 15, afaraOre: 12 }, la: 3 }; ctx.tbPlanInForm();
  assert.equal(d.el.tbPlanMinus.value, "5", "planul altui bot nu intră în formularul lui B");
});
await test("🟡3. planul necitit nu e „Nu ai un plan”: neadus / eroare ⇒ fără rândul gri, cu starea spusă; adus și gol ⇒ rândul", () => {
  const cu = (tbPlan) => { const { ctx, pune } = pagina(ACUM), d = dom(), b = BOT_PLAN();
    Object.assign(ctx, { $: d.$, tbStare: { bot: b, routeOk: true, botLa: ACUM, sfaturiLista: [], alerteServer: [], avertLista: [] }, tbPlan, tbSem: { botId: null, v: null }, tbMinusAtins: {}, tbTextFaraBot: () => "—", tbContTot: () => {}, tbEsteSus: () => false, tbRenderConteaza: () => [] });
    pune("tbRenderTodo", "botiNr"); try { pune("tbPlanCitire", "tbPlanStareAcum"); } catch (e) { /* codul vechi */ }
    ctx.tbRenderTodo(); return { l: ctx.tbStare.todoLista, sub: d.el["tbPlSub-plan"].textContent }; };
  const neadus = cu({ botId: null, plan: null, la: 0 }), er = cu({ botId: "b1", plan: null, la: 0, eroare: "serverul n-a răspuns în 60 s", eroareLa: ACUM }), gol = cu({ botId: "b1", plan: null, la: ACUM }), pus = cu({ botId: "b1", plan: PLAN, la: ACUM });
  assert.ok(!neadus.l.some((x) => /Nu ai un plan/.test(x.titlu)), "neadus"); assert.match(neadus.sub, /aduc planul/);
  assert.ok(!er.l.some((x) => /Nu ai un plan/.test(x.titlu)), "eroare"); assert.match(er.sub, /n-a putut fi citit/);
  assert.ok(gol.l.some((x) => /Nu ai un plan/.test(x.titlu)), "adus și gol"); assert.match(gol.sub, /niciun plan încă/);
  assert.ok(!pus.l.some((x) => /Nu ai un plan/.test(x.titlu))); assert.match(pus.sub, /planul e pus/);
});
await test("🟡3. cererea planului picată: starea „eroare” (nu „fără plan”), reîncercare după 30 s, iar un plan deja citit nu se pierde", async () => {
  const { ctx, ceas, pune } = pagina(ACUM), d = dom(), b = BOT_PLAN(), cereri = [];
  let cade = true;
  Object.assign(ctx, { $: d.$, tbStare: { bot: b }, tbPlan: { botId: null, plan: null, la: 0 }, tbSapt: { botId: null, la: 0, intrari: null, eroare: null, inLucru: false }, textEroare: (e) => String(e && e.message || e), tbPanouVizibil: () => false,
    getJSON: async (u) => { cereri.push(u); if (/action=plan/.test(u)) { if (cade) throw Object.assign(new Error("serverul n-a răspuns în 60 s"), { status: 0 }); return { plan: PLAN }; } return { intrari: [] }; } });
  pune("tbPlanInForm", "tbAduSaptamana"); try { pune("tbPlanCitire", "tbAduPlan"); } catch (e) { /* codul vechi */ }
  await ctx.tbAduSaptamana(b);
  assert.equal(ctx.tbPlan.botId, "b1"); assert.ok(ctx.tbPlan.eroare, "eroarea e ținută: " + JSON.stringify(ctx.tbPlan)); assert.ok(!(ctx.tbPlan.la > 0), "nu „citit”");
  ceas.t += 10000; await ctx.tbAduSaptamana(b);
  assert.equal(cereri.filter((u) => /action=plan/.test(u)).length, 1, "sub 30 s nu se reîncearcă");
  ceas.t += 25000; cade = false; await ctx.tbAduSaptamana(b);
  assert.equal(cereri.filter((u) => /action=plan/.test(u)).length, 2, "după 30 s planul se cere din nou");
  assert.equal(cereri.filter((u) => /action=citeste/.test(u)).length, 1, "istoricul de 7 zile nu se mai cere o dată");
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.tbPlan.plan)), PLAN); assert.ok(!ctx.tbPlan.eroare && ctx.tbPlan.la > 0);
  ceas.t += 11 * 60000; cade = true; await ctx.tbAduSaptamana(b);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.tbPlan.plan)), PLAN, "o reîmprospătare picată nu aruncă planul deja citit");
});

// ───────────── 🟡4. sfaturile înaintea Consilierului ─────────────
await test("🟡4. sfaturile se socotesc o dată pe tură, ÎNAINTEA Consilierului, iar la schimbarea botului listele botului vechi se golesc", () => {
  const { ctx, pune } = pagina(ACUM); let n = 0;
  const bA = BOT_PLAN({ id: "A" }), bB = BOT_PLAN({ id: "B" });
  Object.assign(ctx, { tbStare: { bot: bA, botLa: ACUM, directie: null, extra: null, funding: null }, tbFisa: { botId: null }, tbCheieDir: () => "x", Directie: { rezumat: () => null },
    Sfaturi: { intrare: (o) => o, sfaturi: (o) => { n++; return [{ cod: "pericol", ton: "critic", titlu: "sfatul lui " + o.bot.id }]; } } });
  pune("tbSfaturiAcum");
  const l1 = ctx.tbSfaturiAcum(bA);
  assert.equal(n, 1); assert.equal(ctx.tbStare.sfaturiLista, l1); assert.equal(l1[0].titlu, "sfatul lui A");
  assert.equal(ctx.tbSfaturiAcum(bA, true), l1); assert.equal(n, 1, "desenul sfaturilor din aceeași tură refolosește lista, nu o socotește a doua oară");
  ctx.tbSfaturiAcum(bA, true); assert.equal(n, 2, "următorul desen (fișa sosită, altă tură) socotește din nou");
  assert.equal(ctx.tbSfaturiAcum(bB, true)[0].titlu, "sfatul lui B", "alt bot ⇒ lista lui");
  const rb = fnDin(APP, "renderTabloBot"), iS = rb.indexOf("tbSfaturiAcum(b)"), iB = rb.indexOf("tbDeseneazaBanii(b)");
  assert.ok(iS > 0 && iB > 0 && iS < iB, "în renderTabloBot sfaturile se socotesc înaintea lui tbDeseneazaBanii (care desenează Consilierul)");
  assert.match(fnDin(APP, "renderTabloSfaturi"), /tbSfaturiAcum\(b,true\)/);
  // schimbarea botului: primul desen al botului nou nu mai are în mână sfaturile, lista și verdictul celui vechi
  const p2 = pagina(ACUM); let laDesen = null;
  Object.assign(p2.ctx, { tbStare: { boti: [bA, bB], bot: bA, sfaturiLista: [{ cod: "pericol", ton: "critic", titlu: "lichidarea la 6%" }], todoLista: [{ c: "r", titlu: "x" }], consUlt: { nivel: "iesi" }, sfaturiMemo: { bot: "A" }, extra: null },
    TB_BOT_ALES: "ales", tbScrie: () => true, tbAduDate: () => Promise.resolve(), renderTabloBot: () => { if (!laDesen) laDesen = JSON.parse(JSON.stringify({ s: p2.ctx.tbStare.sfaturiLista, t: p2.ctx.tbStare.todoLista, c: p2.ctx.tbStare.consUlt || null, m: p2.ctx.tbStare.sfaturiMemo || null })); } });
  p2.pune("tbAlegeBot"); p2.ctx.tbAlegeBot("B");
  assert.equal(p2.ctx.tbStare.bot.id, "B");
  assert.deepEqual(laDesen, { s: [], t: [], c: null, m: null });
});

// ───────────── 🟡5. lumânările graficului ─────────────
await test("🟡5. serverul ține lumânările de 5 min cât pe cele de 15 min (45 s), pe cele de 30 min 90 s; restul neschimbate", async () => {
  const M = await import(pathToFileURL(path.join(RAD, "functions", "api", "market.js")).href);
  assert.equal(typeof M.ttlLumanari, "function", "market.js nu exportă ttlLumanari");
  assert.deepEqual(["1M", "5M", "15M", "30M", "60M", "4H", "8H", "12H", "1D"].map(M.ttlLumanari), [45, 45, 45, 90, 90, 180, 300, 300, 300]);
  // v100.337: ruta cere lumânările prin klineCerere (o cerere pe monedă + interval); TTL-ul tot după interval
  assert.match(citeste("functions", "api", "market.js"), /pionexCached\(kc\.url,ttlLumanari\(kc\.interval\),env,opt\)/, "ruta folosește funcția");
});
await test("🟡5. lumânări vechi cu aducerea picată ⇒ nota „lumânările graficului sunt de la HH:MM”; proaspete sau ale altui interval ⇒ nimic", () => {
  const { ctx, pune } = pagina(ACUM); pune("tbGraficVechi");
  const la = ACUM - 7 * 60000, d = new Date(la), hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const g = { la, simbol: "TEST_USDT_PERP|5M", randuri: [{}], eroare: "Pionex klines unavailable", inLucru: false };
  assert.equal(ctx.tbGraficVechi(g, "TEST_USDT_PERP|5M"), "lumânările graficului sunt de la " + hm + " - ultima aducere a picat (Pionex klines unavailable)");
  assert.equal(ctx.tbGraficVechi(Object.assign({}, g, { eroare: null }), "TEST_USDT_PERP|5M"), null);
  assert.equal(ctx.tbGraficVechi(g, "TEST_USDT_PERP|15M"), null);
  assert.equal(ctx.tbGraficVechi(Object.assign({}, g, { randuri: null }), "TEST_USDT_PERP|5M"), null, "fără lumânări graficul spune deja „Nu am prețurile”");
  assert.match(fnDin(APP, "renderTabloBot"), /tbGraficVechi\(tbStare\.grafic,/, "nota intră în rândul de avertismente al paginii");
});

// ───────────── 🟡6. Range Filter ─────────────
await test("🟡6. Range Filter: „CONTRA botului” apare la direcția cu litere mici (short pe TREND SUS, long pe TREND JOS), nu și cu botul", () => {
  const rand = (dirBot, dirRf) => { const { ctx, pune } = pagina(ACUM); const bare = Array.from({ length: 200 }, (_, i) => ({ t: i }));
    Object.assign(ctx, { tbRfStare: { cheie: "TEST_USDT_PERP", bare, la: 1, citire: null, citireLa: 0, inLucru: null }, tbRfCheie: () => "TEST_USDT_PERP", tbRangeFilterAdu: () => {}, getJSON: () => {},
      RangeFilter: { MIN_EP: 10, citire: () => ({ dir: dirRf, bareDir: 3, semnal: null, regim: { cons: false }, dovada: { n: 0 }, distPct: null, flipAtr: null }) } });
    pune("tbRangeFilterRand"); return ctx.tbRangeFilterRand({ id: "b1", directie: dirBot }).text; };
  assert.match(rand("short", 1), /CONTRA botului/); assert.match(rand("long", -1), /CONTRA botului/);
  assert.doesNotMatch(rand("long", 1), /CONTRA/); assert.doesNotMatch(rand("short", -1), /CONTRA/); assert.doesNotMatch(rand("neutral", 1), /CONTRA/);
});

// ───────────── 🟡7. cheile localStorage ─────────────
await test("🟡7. cheile ținute pe bot ale boților dispăruți se șterg; ale boților vii, ale T212 și restul rămân; fără boți vii nu se șterge nimic", () => {
  const { ctx, pune } = pagina(ACUM); vm.runInContext("var TB_CHEI_BOT=" + (/var TB_CHEI_BOT=(\[[^\]]*\])/.exec(APP) || [0, "null"])[1] + ";", ctx); pune("tbCurataChei");
  const magazie = (o) => { const m = Object.assign({}, o); return { get length() { return Object.keys(m).length; }, key: (i) => Object.keys(m)[i] ?? null, removeItem: (k) => { delete m[k]; }, m }; };
  const toate = { "tabloBotIstoric_v1_mort": "[1]", "tabloBotIstoric_v1_viu": "[2]", "ctVazut:mort": "{}", "ctVazut:viu": "{}", "indVazut:mort": "{}", "indVazut:t212:AAPL_US_EQ": "{}", "tbTvGrid:mort": "{}", "tbTvGrid:viu": "{}", tabloBotAles_v1: "\"viu\"", tbFisaUlt: "{}", radarSettings: "{}" };
  const st = magazie(toate), n = ctx.tbCurataChei(st, ["viu"]);
  assert.equal(n, 4);
  assert.deepEqual(Object.keys(st.m).sort(), ["ctVazut:viu", "indVazut:t212:AAPL_US_EQ", "radarSettings", "tabloBotAles_v1", "tabloBotIstoric_v1_viu", "tbFisaUlt", "tbTvGrid:viu"].sort());
  const st2 = magazie(toate); assert.equal(ctx.tbCurataChei(st2, []), 0); assert.equal(Object.keys(st2.m).length, Object.keys(toate).length, "lista goală (citire îndoielnică) nu șterge nimic");
  assert.match(fnDin(APP, "tbAduDate"), /tbCurataChei\(localStorage,/, "curățenia e chemată la citirea boților");
});

// ───────────── (c) vocile de sub verdict ─────────────
await test("(c) vocile: „Monte Carlo” o singură dată - rândul scorului (tbCitMc) nu e o voce", () => {
  const S = lib("asezare-paznic.js"), i = S.indexOf("  function formaVoce("), j = S.indexOf("\n  var ultimBotV", i);   /* v100.336 (I-866): voci() cheamă formaVoce */
  assert.ok(i > 0 && j > i);
  const copil = (t, cls) => ({ textContent: t, className: cls, classList: { contains: (c) => (" " + cls + " ").indexOf(" " + c + " ") >= 0 } });
  const copii = [copil("Lateral, fără trend clar.", "tbCitScurt"), copil("Graficul pe 4h și Monte Carlo spun la fel: cu botul tău (short)", "tbCitVoci info"),
    copil("🎰 Scorul Monte Carlo 83 – 79 a avut dreptate de 83 de ori · Monte Carlo: pe plus în 61% din drumuri", "tbCitR info tbCitMc"), copil("· Busola, pe 4h: mai calmă ca de obicei", "tbCitR info")];
  const voci = new Function("document", "$", S.slice(i, j) + "\n  return voci();")({ querySelectorAll: () => [] }, (id) => (id === "tbCitire" ? { children: copii } : null));
  assert.deepEqual(voci.map((v) => v.n + ":" + v.ton), ["Monte Carlo:da", "Busola:neutru"]);
});

// ───────────── (d) frâna contului necunoscută ─────────────
await test("(d) Tabloul fără bot: frâna contului necunoscută = „încă verific”, nu tăcere; știută și netrasă = nimic; trasă = rândul ei", () => {
  const cu = (stiut, fc) => { const { ctx, pune } = pagina(ACUM), el = { innerHTML: "" };
    Object.assign(ctx, { tbStare: { citireGoala: false }, tbPreg: { la: ACUM, inLucru: false, fisa: null, vreme: { eticheta: "🟡 PRUDENT", titlu: "piața e amestecată", faCe: "Aș porni doar grid neutru." }, grid: null }, tbPregatireAdu: () => {},
      acFranaContText: () => fc, acFranaContStiut: () => stiut });
    pune("tbPregatire"); ctx.tbPregatire(el); return text(el.innerHTML); };
  assert.match(cu(false, ""), /Frâna contului: încă verific/);
  assert.doesNotMatch(cu(true, ""), /Frâna contului/);
  const trasa = cu(true, "N-aș porni nimic nou: raportul pe tot contul lipsește.");
  assert.match(trasa, /Frâna contului azi: N-aș porni nimic nou/); assert.doesNotMatch(trasa, /încă verific/);
});

// ───────────── 🔵 cele mici ─────────────
await test("🔵 „bara de acum” din tabelul trendului: la un short urcarea e roșie și coborârea verde; la long ca înainte", () => {
  const clasa = (dir, bara) => { const { ctx, pune } = pagina(ACUM), d = dom();
    Object.assign(ctx, { $: d.$, tbStare: { bot: { id: "b1", baza: "TEST.PERP", quote: "USDT", directie: dir }, routeOk: true, directie: null }, tbSemaforTf: () => [{}], tbCheieDir: () => "k", TB_DIR_TF: [{ tf: "4H" }], tbCazuriAdu: () => {}, tbCazuri: { sem: null },
      GraficBot: { trendTabel: () => [{ ton: "info", sageata: "→", et: "4h", bec: "lateral", fata: "neutru", adx: 20, rsi: 50, scor: null, intors: null, bara }], trendSumar: () => ({ stare: "info", text: "x" }) } });
    pune("tbFormateazaSemn", "renderTabloTrend"); ctx.renderTabloTrend();
    return (/<span class="([a-z]*)">[+−]?\d/.exec(d.el.tbTrend.innerHTML) || [0, "?"])[1]; };
  assert.equal(clasa("long", 0.8), "good"); assert.equal(clasa("long", -0.8), "bad");
  assert.equal(clasa("short", 0.8), "bad"); assert.equal(clasa("short", -0.8), "good");
});
await test("🔵 „Dacă prețul ajunge la…”: rândul opritorului ia prețul viu al stopului în procente (ca take-profit-ul)", () => {
  const { ctx, pune } = pagina(ACUM), b = bot(LONG10({ stop: 96.5, stopRaport: -0.2 }));
  Object.assign(ctx, { tbStare: { scenariuPropriu: null } }); pune("botiNr", "tbTinteScenariu");
  const viu = ctx.TabloExtra.pretStopLive(b), op = ctx.tbTinteScenariu(b).filter((x) => x.eticheta === "opritorul")[0];
  assert.ok(viu > 0 && Math.abs(viu - 96.5) > 0.05, "premisa: prețul viu (" + viu + ") diferă de cel al serverului");
  assert.ok(op && Math.abs(op.pret - viu) < 1e-9, JSON.stringify(op));
});
await test("🔵 „Banii botului”: „pe grilă ≈ … USDT” cu virgulă (TextRo.num), ca cifra de sus", () => {
  const f = fnDin(APP, "tbDeseneazaBanii");
  assert.doesNotMatch(f, /pg\.usdt\.toFixed\(3\)/); assert.match(f, /tbPeGrilaUsdt\(pg\.usdt\)/);   /* v100.333: o zecimală (două / trei doar sub 0,095 / 0,0095), nu trei mereu */
});

// ───────────── optimizarea: lumânările de 5 min ale măsurilor ─────────────
await test("optimizare: lumânările de 5 min ale măsurilor nu se mai cer la fiecare tură de 8 s (10 ture: 10 cereri ⇒ cel mult 2; cu graficul pe 5m, 0)", async () => {
  const ruleaza = async (src, cuGrafic) => { const { ctx, ceas } = pagina(ACUM), b = BOT_PLAN(), cereri = [];
    const kl = Array.from({ length: 288 }, (_, i) => ({ time: ACUM - (288 - i) * 300000, open: "10", high: "10.1", low: "9.9", close: "10", volume: "5" }));
    Object.assign(ctx, { tbStare: { bot: null, botBrut: null, boti: [], klinePerp: [], klineStare: "ok", funding: { sim: "TEST_USDT_PERP", la: ACUM, info: null }, graficCache: {}, pretSpot: null, pretSpotLa: 0, istoric: [], citireGoalaDe: 0 },
      TB_ISTORIC_PREFIX: "tabloBotIstoric_v1_", TB_BOT_ALES: "tabloBotAles_v1", tbCiteste: () => null, tbScrie: () => true, tbPretSpotProaspat: () => false, tbPanouVizibil: () => true, tbPorneWs: () => {}, renderTabloBot: () => {}, textEroare: (e) => String(e && e.message || e), localStorage: { length: 0, key: () => null, removeItem: () => {} },
      getJSON: async (u) => { cereri.push(u); return /bot-orders/.test(u) ? { bots: [b] } : { data: { klines: kl.slice(-100) } }; } });
    for (const n of ["tbAduDate", "tbKlineDinCache", "tbCurataChei"]) { try { vm.runInContext(fnDin(src, n), ctx); } catch (e) { /* codul vechi nu le are */ } }
    if (/var TB_CHEI_BOT=/.test(src)) vm.runInContext("var TB_CHEI_BOT=" + /var TB_CHEI_BOT=(\[[^\]]*\])/.exec(src)[1] + ";", ctx);
    for (let i = 0; i < 10; i++) { if (cuGrafic) ctx.tbStare.graficCache["TEST_USDT_PERP|5M"] = { cheie: "TEST_USDT_PERP|5M", randuri: kl, la: ceas.t - 30000 }; await ctx.tbAduDate(); ceas.t += 8000; }
    return { cereri: cereri.filter((u) => /pionex_klines/.test(u)).length, bare: ctx.tbStare.klinePerp.length, stare: ctx.tbStare.klineStare, ultima: ctx.tbStare.klinePerp.length ? Number(ctx.tbStare.klinePerp[ctx.tbStare.klinePerp.length - 1].time) : null }; };
  const fara = await ruleaza(APP, false), cu = await ruleaza(APP, true);
  console.log("       măsura: 10 ture de 8 s ⇒ cereri de lumânări 5M: " + fara.cereri + " (fără graficul pe 5m), " + cu.cereri + " (cu graficul pe 5m); înainte: 10 și 10");
  assert.ok(fara.cereri <= 2, "fără cache: " + fara.cereri); assert.equal(cu.cereri, 0);
  assert.equal(fara.bare, 100); assert.equal(cu.bare, 100); assert.equal(cu.stare, "ok");
  assert.equal(cu.ultima, ACUM - 300000, "din cache se iau ultimele 100, în ordinea timpului");
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
