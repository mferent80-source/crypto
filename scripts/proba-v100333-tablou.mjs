// Proba v100.333 · Tabloul botului, ce rămăsese după v100.332 (13.11.2026, el: „rezolvă tot ce a mai rămas”). Testele au fost scrise ÎNTÂI și
// văzute picând pe v100.332 (7e69d0a):
//   🔵1 un singur model pentru „totalul dacă prețul ajunge la X” (TabloExtra.totalCuGridLa, cu comisionul de închidere) - și în „Dacă prețul
//       ajunge la…”, în banii din „Contează acum” și în sfatul de margine · 🔵3 „botul ales de tine nu mai e în listă” nu mai rămâne pe veci ·
//   🔵5 funding-ul din „Mediul botului” spune că e ultima rată și, când media pe 7 zile zice altceva, o spune · 🔵8 grilele tăiate de un preț
//       socotite într-un singur loc (TabloExtra.grileDincoloK), prețul din „Contează acum” = cel din sfaturi · 🔵10 fișa ținută minte își spune
//       ora în motivul sfatului „zero” · 🔵11 stopul deja dincolo de zero nu e împins mai departe · revizia Opus: (a) Consilierul spune când
//       planul n-a putut fi citit · (b) „pe grilă ≈ … USDT” cu o zecimală (două / trei doar când suma e sub 0,095 / 0,0095).
//   node scripts/proba-v100333-tablou.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const APP = citeste("public", "app.js");
const fnDin = (src, nume) => {
  let i = src.indexOf("\nasync function " + nume + "("); if (i < 0) i = src.indexOf("\nfunction " + nume + "(");
  assert.ok(i >= 0, "lipsește funcția " + nume); i++;
  const cap = ["\nfunction ", "\nasync function ", "\nvar ", "\n//", "\n/*", "\ndocument.", "\nif(", "\nlet ", "\nconst "].map((t) => src.indexOf(t, i + 10)).filter((x) => x > 0);
  return src.slice(i, cap.length ? Math.min(...cap) : undefined);
};
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const J = (x) => JSON.parse(JSON.stringify(x));
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); }); }
console.log("\nV100.333 · Tabloul botului: ce rămăsese din auditul 12.11 · proba\n");

const ORA = 3600000, ACUM = Date.parse("2026-11-13T10:00:00Z");
const LIBS = ["text-ro.js", "grid-calcul.js", "scenariu.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "curba-stop.js", "conteaza.js", "pret-viu.js", "tablou-bot.js"];
const NUME = ["TextRo", "GridCalcul", "Scenariu", "TabloExtra", "Alerte", "SemnaleBot", "Sfaturi", "CurbaStop", "Conteaza", "PretViu", "TabloBot"];
function pagina(acum, extra, libs) {
  const ceas = { t: acum };
  class DataFixa extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.t); } static now() { return ceas.t; } }
  const ctx = Object.assign({ console, Intl, Math, JSON, isFinite, Number, String, Array, Object, RegExp, isNaN, parseFloat, parseInt, Set, Map, Promise, setTimeout, clearTimeout, encodeURIComponent, Date: DataFixa }, extra || {});
  ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
  const L = libs || LIBS;
  vm.runInContext(L.map(lib).join("\n;\n") + "\n" + NUME.map((n) => `this.${n} = typeof ${n} !== 'undefined' ? ${n} : null;`).join("\n"), ctx);
  ctx.escapeHtml = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const pune = (...nume) => { nume.forEach((n) => vm.runInContext(fnDin(APP, n), ctx)); return ctx; };
  return { ctx, ceas, pune };
}
function dom() { const el = {}; const $ = (id) => el[id] || (el[id] = { id, innerHTML: "", textContent: "", value: "", hidden: false, className: "", open: false, classList: { toggle() {}, contains() { return false; }, add() {}, remove() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, setAttribute() {}, getAttribute() { return null; } }); return { $, el }; }
// un bot normalizat ca în functions/api/bot-orders.js
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
    opritorPierdere: o.stop ?? null, opritorPierdereActiv: !!o.stop, opritorPierdereTip: o.stop ? "pret" : null, opritorPierdereRaport: null, avertismente: [], brut }, lich);
}
const FIX = JSON.parse(citeste("scripts", "date", "curba-stop-fixtura.json"));
const BARE = FIX.seturi.map((s) => s.t.map((t, i) => ({ t, o: s.o[i], h: s.h[i], l: s.l[i], c: s.c[i] })));
const LONG5 = (x) => Object.assign({ dir: "long", levier: 5, investit: 200, profitNet: 3, pozitie: 5, pretDeschidere: 102, pret: 100, jos: 90, sus: 110, row: 41, perVolume: 0.25, stop: 89, lichJos: 80, pornitLa: ACUM - 30 * ORA }, x || {});
const SHORT_GEO = (x) => Object.assign({ dir: "short", levier: 5, investit: 200, profitNet: 1, pozitie: -5, pretDeschidere: 98.5, pret: 100, jos: 90, sus: 110, row: 41, perVolume: 0.25, gridType: "geometric", stop: 111, lichSus: 121, pornitLa: ACUM - 30 * ORA }, x || {});

// ───────────── 🔵1. un singur model pentru „totalul la prețul X” ─────────────
await test("🔵1a. Scenariu.scenarii(…, totalLa): totalul rândului e cel al modelului dat (TabloExtra.totalCuGridLa); poziția și „lichidat” rămân ale scenariului", () => {
  const { ctx } = pagina(ACUM), { Scenariu, TabloExtra } = ctx;
  for (const o of [LONG5(), SHORT_GEO()]) {
    const b = bot(o), tinte = [{ eticheta: "stop", pret: o.stop }, { eticheta: "jos", pret: o.jos }, { eticheta: "sus", pret: o.sus }];
    const vechi = Scenariu.scenarii(b.brut, b, tinte), nou = Scenariu.scenarii(b.brut, b, tinte, (x) => TabloExtra.totalCuGridLa(b, x));
    nou.randuri.forEach((r, i) => {
      const t = Math.max(TabloExtra.totalCuGridLa(b, r.pret), -o.investit);
      assert.ok(Math.abs(r.total - t) < 1e-9, o.dir + " la " + r.pret + ": " + r.total + " ≠ " + t);
      assert.equal(r.pozitie, vechi.randuri[i].pozitie); assert.equal(r.gol, vechi.randuri[i].gol);
    });
    assert.ok(vechi.randuri.some((r, i) => Math.abs(r.total - nou.randuri[i].total) > 0.5), "premisa: modelele chiar diferă (comisionul de închidere)");
  }
});
await test("🔵1b. pagina: „Dacă prețul ajunge la…” și banii din „Contează acum” (tbCtBani) dau totalul lui TabloExtra.totalCuGridLa", () => {
  const { ctx, pune } = pagina(ACUM), d = dom(), b = bot(LONG5());
  Object.assign(ctx, { $: d.$, tbStare: { bot: b, botBrut: b.brut, routeOk: true, scenariuPropriu: null } });
  pune("botiNr", "botiBan", "tbPretScurt", "tbFormateazaSemn", "tbTinteScenariu", "tbScenLichidat", "renderTabloScenarii", "tbCtBani");   /* v100.339: + tbScenLichidat */ try { pune("tbTotalLa"); } catch (e) { /* v100.332 nu o are */ }
  const t = ctx.TabloExtra.totalCuGridLa(b, 90);
  assert.ok(Math.abs(ctx.tbCtBani(b, 90) - t) < 1e-9, "tbCtBani " + ctx.tbCtBani(b, 90) + " ≠ " + t);
  ctx.renderTabloScenarii();
  const rand = text(d.el.tbScenarii.innerHTML).split("90.0000")[1] || "";
  assert.ok(rand.indexOf(ctx.botiBan(t, 1)) >= 0, "rândul marginii de jos: " + rand.slice(0, 120) + " · aștept " + ctx.botiBan(t, 1));
});
await test("🔵1c. sfatul de margine (Tablou + colector): „total ~X” la marginea de jos = TabloExtra.totalCuGridLa; fără TabloExtra (probele vechi) ca înainte", () => {
  const { ctx } = pagina(ACUM), b = bot(LONG5({ pret: 92 }));
  const k4 = Array.from({ length: 400 }, (_, i) => ({ time: ACUM - (400 - i) * 4 * ORA, open: "100", high: "101", low: i % 9 === 0 ? "88" : "99", close: "100" }));
  const m = ctx.Sfaturi.sfaturi(ctx.Sfaturi.intrare({ bot: b, k4, acum: ACUM })).filter((s) => s.cod === "margine")[0];
  const t = ctx.TabloExtra.totalCuGridLa(b, 90);
  assert.ok(m && m.text.indexOf("total ~" + ctx.TextRo.usdt(t, ctx.TextRo.zecMici(t))) >= 0, (m && m.text) + " · aștept " + ctx.TextRo.usdt(t, 1));
});

// ───────────── 🔵3. botul ales dispărut ─────────────
await test("🔵3. „botul ales de tine nu mai e în listă”: alegerea dispărută se uită după 10 minute de liste întregi; o listă tăiată sau goală nu o uită", async () => {
  const { ctx, ceas, pune } = pagina(ACUM), b = bot(LONG5()), scrieri = [];
  let pref = "mort", trunchiat = false;
  Object.assign(ctx, { tbStare: { bot: null, botBrut: null, boti: [], klinePerp: [], klineStare: "ok", funding: { sim: "TEST_USDT_PERP", la: ACUM, info: null }, graficCache: {}, pretSpot: null, pretSpotLa: 0, istoric: [], citireGoalaDe: 0 },
    TB_ISTORIC_PREFIX: "tabloBotIstoric_v1_", TB_BOT_ALES: "tabloBotAles_v1", tbCiteste: (k) => (k === "tabloBotAles_v1" ? pref : null), tbScrie: (k, v) => { scrieri.push([k, v]); if (k === "tabloBotAles_v1") pref = v; return true; },
    tbPretSpotProaspat: () => false, tbPanouVizibil: () => false, tbPorneWs: () => {}, renderTabloBot: () => {}, textEroare: (e) => String(e), localStorage: { length: 0, key: () => null, removeItem: () => {} }, tbKlineDinCache: () => null, tbCurataChei: () => 0,
    getJSON: async (u) => (/bot-orders/.test(u) ? { bots: [b], probleme: trunchiat ? { trunchiat: true } : null } : { data: { klines: [] } }) });
  pune("tbAduDate");
  await ctx.tbAduDate();
  assert.equal(ctx.tbStare.motivAlegere, "preferat-disparut", "premisa");
  ceas.t += 5 * 60000; await ctx.tbAduDate();
  assert.equal(pref, "mort", "sub 10 minute alegerea rămâne (poate fi o citire proastă)");
  trunchiat = true; ceas.t += 6 * 60000; await ctx.tbAduDate();
  assert.equal(pref, "mort", "o listă tăiată nu șterge alegerea");
  trunchiat = false; ceas.t += 1000; await ctx.tbAduDate();
  assert.equal(pref, "", "după 10 minute de liste întregi fără el, alegerea se uită");
  assert.notEqual(ctx.tbStare.motivAlegere, "preferat-disparut", "nota nu mai rămâne pe ecran");
});

// ───────────── 🔵5. funding-ul din „Mediul botului” ─────────────
await test("🔵5. „Mediul botului · Funding”: spune „ultima rată”; când media pe 7 zile (a KPI-ului) zice altceva, o spune, iar plata pe medie e atenție", () => {
  const { ctx, pune } = pagina(ACUM); pune("tbFundingMediu");
  const rand = (t, bp, ton) => ({ k: "funding", eticheta: "Funding", text: t, ton, botPlateste: bp });
  const a = ctx.tbFundingMediu([rand("0,010% la 8h · plătesc long (tu plătești)", true, "neutru")], { rataZi: -0.0006 }, "long")[0];
  assert.match(a.text, /^ultima rată 0,010% la 8h/); assert.match(a.text, /media pe 7 zile −0,06% pe zi: încasezi/); assert.equal(a.ton, "neutru");
  const b = ctx.tbFundingMediu([rand("−0,010% la 8h · plătesc short (tu încasezi)", false, "bine")], { rataZi: 0.0009 }, "long")[0];
  assert.match(b.text, /media pe 7 zile 0,09% pe zi: plătești/); assert.equal(b.ton, "atentie");
  const c = ctx.tbFundingMediu([rand("0,010% la 8h · plătesc long (tu plătești)", true, "neutru")], { rataZi: 0.0003 }, "long")[0];
  assert.equal(c.text, "ultima rată 0,010% la 8h · plătesc long (tu plătești)", "același semn ⇒ fără media");
  const n = ctx.tbFundingMediu([rand("n-am rata de la Pionex", false, "neutru"), { k: "btc", text: "x" }], { rataZi: 0.0009 }, "long");
  assert.equal(n[0].text, "n-am rata de la Pionex"); assert.equal(n[1].text, "x");
  assert.match(fnDin(APP, "renderTabloIndicatori"), /tbFundingMediu\(IndicatoriBot\.mediu\(/);
});

// ───────────── 🔵8. o singură socoteală pentru grilele tăiate, un singur preț ─────────────
await test("🔵8a. grilele tăiate de un preț: TabloExtra.grileDincoloK e socoteala; Alerte, SemnaleBot, Sfaturi și gridVsPlan o folosesc când e încărcată", () => {
  const { ctx } = pagina(ACUM), { TabloExtra } = ctx;
  assert.equal(typeof TabloExtra.grileDincoloK, "function");
  let n = 0; const real = TabloExtra.grileDincoloK; TabloExtra.grileDincoloK = (...a) => { n++; return real(...a); };
  const b = bot(LONG5()), o = SHORT_GEO();
  ctx.Alerte.griliMoarte(b, 95); assert.equal(n, 1, "Alerte");
  ctx.SemnaleBot.griliMoarte(b, 95); assert.equal(n, 2, "SemnaleBot");
  ctx.Sfaturi.griliTaiateTp(b, 105); assert.equal(n, 3, "Sfaturi (partea de câștig)");
  TabloExtra.grileDincoloK = real;
  // gridVsPlan o cheamă din interior (aceeași funcție): grilele tăiate de stopul planului = grileDincoloK la acel preț
  const g = TabloExtra.gridVsPlan(bot(LONG5({ stop: null })), 20);
  assert.ok(g && g.stopPlan > 90 && g.stopPlan < 110, "premisa: planul cade în grid " + JSON.stringify(g));
  assert.equal(g.moarte, real(bot(LONG5({ stop: null })), g.stopPlan).moarte);
  assert.match(lib("tablou-extra.js"), /var gk = stopPlan !== null \? grileDincoloK\(b, stopPlan\) : null;/);
});
await test("🔵8b. paritatea: copiile de rezervă (modulele încărcate singure) dau exact ce dă TabloExtra.grileDincoloK, pe 400 de cazuri", () => {
  const plin = pagina(ACUM).ctx, singure = pagina(ACUM, null, ["text-ro.js", "grid-calcul.js", "alerte.js", "semnale-bot.js", "sfaturi.js"]).ctx;
  let s = 7; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = 0; i < 400; i++) {
    const jos = 50 + 50 * r(), sus = jos * (1.05 + 0.5 * r()), x = jos + (sus - jos) * r(), dir = r() < 0.5 ? "long" : "short";
    const b = bot({ dir, levier: 5, investit: 100, profitNet: 0, pozitie: dir === "long" ? 1 : -1, pretDeschidere: x, pret: x, jos, sus, row: 2 + Math.floor(60 * r()), perVolume: 0.1, gridType: r() < 0.5 ? "geometric" : "arithmetic" });
    const k = plin.TabloExtra.grileDincoloK(b, x, false), kc = plin.TabloExtra.grileDincoloK(b, x, true);
    assert.deepEqual(J(singure.Alerte.griliMoarte(b, x)), J(k), "Alerte " + i);
    assert.deepEqual(J(singure.SemnaleBot.griliMoarte(b, x)), J(k), "SemnaleBot " + i);
    assert.equal(singure.Sfaturi.griliTaiateTp(b, x), kc && kc.moarte >= 1 ? kc.txt : null, "Sfaturi " + i);
  }
});
await test("🔵8c. prețul din „Contează acum” e scris exact ca în sfaturi (aceeași funcție)", () => {
  const { ctx } = pagina(ACUM);
  const singur = pagina(ACUM, null, ["text-ro.js", "conteaza.js"]).ctx;
  for (const v of [0.000123456, 0.0123, 0.3, 1.23456, 96.5, 67250, null]) { assert.equal(ctx.Conteaza.pret(v), ctx.Sfaturi.pret(v), String(v)); assert.equal(singur.Conteaza.pret(v), ctx.Sfaturi.pret(v), "rezerva " + v); }
});

// ───────────── 🔵10. fișa ținută minte ─────────────
await test("🔵10. fișa ținută minte (de la HH:MM) își spune ora în motivul sfatului „zero”; fișa proaspătă - ca înainte", () => {
  const { ctx, pune } = pagina(ACUM), { Sfaturi } = ctx;
  const fisa = { directie: null, verdict: { nivel: "nu", motive: ["proba respinge"] }, regim: { miscare: false }, setare: { levierSigur: 5 } };
  const b = bot({ dir: "short", levier: 5, investit: 100, profitNet: -1.0, pozitie: -3, pretDeschidere: 71.2, pret: 71.6, jos: 68, sus: 74, row: 41, perVolume: 0.02, lichSus: 85, pornitLa: ACUM - 3 * ORA });
  const la = ACUM - 70 * 60000, d = new Date(la), hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const z = (fisaLa) => Sfaturi.sfaturi(Sfaturi.intrare({ bot: b, acum: ACUM, fisa, fisaLa })).filter((s) => s.cod === "zero")[0];
  assert.match(z(null).faCe, /: fișa monedei zice NU\.$/);
  const v = z(la).faCe; assert.ok(v.indexOf("fișa monedei de la " + hm + " zice NU") > 0, v); assert.ok(v.length <= 110, v.length);
  Object.assign(ctx, { tbStare: { bot: b, directie: null, extra: null, funding: null }, tbFisa: { botId: "b1", fisa, la, veche: true }, tbCheieDir: () => "x", Directie: { rezumat: () => null } });
  pune("tbSfaturiAcum");
  const zz = ctx.tbSfaturiAcum(b).filter((s) => s.cod === "zero")[0];
  assert.ok(zz.faCe.indexOf("de la " + hm) > 0, "pagina dă ora fișei ținute minte: " + zz.faCe);
});

// ───────────── 🔵11. stopul deja dincolo de zero ─────────────
await test("🔵11. stopul care păstrează câștigul (atins: totalul ≥ 0) nu e împins mai departe; rândul spune cât păstrează", () => {
  const { ctx } = pagina(FIX.acum), { CurbaStop, TabloExtra, Conteaza, TextRo } = ctx, curba = CurbaStop.curba(BARE, FIX.acum, { zile: FIX.zile, pas: FIX.pas });
  const b = bot({ dir: "long", levier: 5, investit: 100, profitNet: 2, pozitie: 6, pretDeschidere: 97, pret: 100, jos: 97, sus: 106, row: 31, perVolume: 0.3, stop: 99, lichJos: 85, pornitLa: FIX.acum - 5 * ORA });
  const laStop = TabloExtra.totalLaOpritor(b); assert.ok(laStop > 0, "premisa: stopul păstrează câștigul (" + laStop + ")");
  const s = TabloExtra.stopPropus(b, CurbaStop.pentruStop({ curba, atr: 0.6, pret: 100, stop: 99, dir: "long", acum: FIX.acum }));
  assert.equal(s.mut20, null); assert.equal(s.mutOprit, "adapost");
  const rand = Conteaza.alege({ stop: s, sfaturi: [], lista: [], sanse: [] })[0];
  assert.doesNotMatch(rand.faCe, /muți stopul|mult mai departe/);
  assert.ok(rand.faCe.indexOf("păstrează " + TextRo.usdt(laStop, 1)) > 0, rand.faCe);
});

// ───────────── revizia Opus ─────────────
await test("(a) Consilierul spune când planul n-a putut fi citit: „planul n-a putut fi citit, judec fără el”", () => {
  const { ctx, pune } = pagina(ACUM), b = bot(LONG5());
  Object.assign(ctx, { tbPlan: { botId: "b1", plan: null, la: 0, eroare: "serverul n-a răspuns în 60 s" }, tbRezumatHtml: () => "", tbDecStareText: () => "", tbConsRestDeschis: false, Consiliu: {} });
  pune("tbPlanCitire", "tbPlanNecitit", "tbConsHtml");
  const t = ctx.tbPlanNecitit(b); assert.match(t, /^planul n-a putut fi citit, judec fără el/);
  ctx.tbPlan = { botId: "b1", plan: { minus: 15 }, la: ACUM }; assert.equal(ctx.tbPlanNecitit(b), null);
  ctx.tbPlan = { botId: null, plan: null, la: 0 }; assert.equal(ctx.tbPlanNecitit(b), null, "încă neadus nu e „n-a putut”");
  const h = text(ctx.tbConsHtml({ nivel: "tine", eticheta: "ȚINE", titlu: "x", motive: [], rest: [], planNecitit: t }));
  assert.ok(h.indexOf("planul n-a putut fi citit, judec fără el") >= 0, h);
  assert.match(fnDin(APP, "tbDeseneazaSemafor"), /cons\.planNecitit=tbPlanNecitit\(b\)/);
});
await test("(b) „pe grilă ≈ … USDT” cu o zecimală (sub 0,095 două, sub 0,0095 trei - să nu iasă „0,0”), în „Banii botului” și în KPI", () => {
  const { ctx, pune } = pagina(ACUM); pune("tbPeGrilaUsdt");
  assert.equal(ctx.tbPeGrilaUsdt(0.4567), "0,5"); assert.equal(ctx.tbPeGrilaUsdt(0.0456), "0,05"); assert.equal(ctx.tbPeGrilaUsdt(0.00456), "0,005");
  assert.match(fnDin(APP, "tbDeseneazaBanii"), /tbPeGrilaUsdt\(pg\.usdt\)/); assert.match(fnDin(APP, "tbDeseneazaKpi"), /tbPeGrilaUsdt\(pg\.usdt\)/);
  assert.doesNotMatch(APP, /TextRo\.num\(pg\.usdt,3\)/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
