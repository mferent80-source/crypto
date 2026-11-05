// Proba v100.306 · A (auditul final 05.11.2026, partea de ECRAN). Ce probează, pe codul paginii (vm, fără server):
//   I-824  o singură regulă „azi nu” (pauza sezonului + frâna zilei din „Boții tăi” + verdictul pieței MIȘCARE), folosită de „Ce aș cumpăra azi”,
//          „Idei de azi”, Sugestii (lista + antetul), Tabloul (caseta și pregătirea fără bot), Scanner; lista rămâne la vedere, sub „azi nu”;
//   I-826  scorul sezonului: „o pierdere = 3,0 câștiguri” (raportul era inversat), sumele și numerele mari cu separator de mii, fără Win / Loss;
//   fără bot: „Niciun bot pornit” (și ultimul închis) în loc de „Aștept botul…” / „colectorul pare oprit”; Tabloul fără bot = un singur card;
//   I-836  fișa Grid pe telefon (formularul strâns, „nicio variantă nu câștigă”), Futures pe pagina nouă, Alerte (50, pe zile, „Doar importante”
//          pe telefon, „info” neutru), Range Filter (ton neutru, „colorant de trend (nedovedit)”, AȘTEAPTĂ, numărătoarea), breadth fără xStocks;
//   mărunte: țintele de atingere pe telefon, cele două „Profile” din sertar.
//   node scripts/proba-v100306-a.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const APP = citeste("public", "app.js"), CSS = citeste("public", "app.css"), IDX = citeste("public", "index.html");
const taie = (s, nume, f) => { const i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); const k = s.indexOf("\nasync function ", i + 10); const capat = [j, k].filter((x) => x > 0); return s.slice(i, capat.length ? Math.min(...capat) : undefined); };
const fnDin = (f, nume) => taie(lib(f), nume, f);
const fnApp = (nume) => taie(APP, nume, "app.js");
const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.306 · A · ecranul din auditul final: „azi nu”, scorul sezonului, fără bot, telefonul · proba\n");

const ACUM = Date.UTC(2026, 10, 5, 12, 0, 0);   // 05.11.2026 14:00 la București
const contextul = (extra) => {
  const ctx = vm.createContext(Object.assign({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, isNaN, RegExp, escapeHtml: esc, TextRo: globalThis.TextRo }, extra || {}));
  for (const f of ["grid-calcul.js", "obiceiuri.js", "acasa.js"]) vm.runInContext(lib(f), ctx, { filename: f });
  return ctx;
};
const ACASA_FN = ["acCate", "acClasamentSumar", "acPauzaSezon", "acFrazaPauza", "acAziNuDin", "acAziNu", "acVremeAziNu", "acAziNuHtml", "acUltimInchisText", "acasaCumpar", "acasaCumpar2Parti", "acIdeiHtml", "acSemn", "acUsd"];
const cuAcasa = (extra) => { const ctx = contextul(extra); vm.runInContext(ACASA_FN.map((f) => fnDin("acasa-ecran.js", f)).join("\n"), ctx); Object.assign(ctx, extra || {}); return ctx; };   /* felia lui acCate aduce și `var acasa` */
const M = (s, stare, o) => Object.assign({ simbol: s + "_USDT_PERP", stare, scor: 1, dir: "long", regim: { miscare: false } }, o || {});
const CL_LINISTE = { monede: [M("STX", "candidat", { scor: 3 }), M("LIT", "candidat", { scor: 2 }), M("CC", "candidat"), M("BTC", "candidat"), M("ETH", "evita"), M("SOL", "candidat")] };
const CL_MISCARE = { monede: [M("STX", "candidat", { scor: 3 }), M("LIT", "candidat", { scor: 2 }), M("BTC", "evita", { regim: { miscare: true } }), M("ETH", "evita"), M("SOL", "evita")] };
const pierderi = (n) => Array.from({ length: n }, (_, i) => ({ id: "p" + i, moneda: "XMR", dir: "long", levier: 5, pornit: ACUM - (5 - i) * 3600000, inchis: ACUM - (4 - i) * 3600000, net: -2.1 }));

// ================================================================ I-824
await test("I-824.1 acAziNuDin: frâna, pauza, piața în MIȘCARE ⇒ „azi nu” cu motivul; fără niciuna ⇒ da; frâna și piața bat lista", () => {
  const c = cuAcasa();
  assert.equal(c.acAziNuDin({}).nu, false);
  assert.equal(c.acAziNuDin({ pauzaN: 0, frana: { activa: false, depasit: [] }, vreme: { nivel: "liniste" } }).nu, false);
  const p = c.acAziNuDin({ pauzaN: 3 }); assert.equal(p.nu, true); assert.equal(p.motive[0].cod, "pauza"); assert.match(p.motiv, /3 pierderi la rând/);
  const f = c.acAziNuDin({ frana: { activa: true, depasit: [{ cod: "boti", text: "8 boți porniți azi (pragul: 7)" }] } }); assert.equal(f.nu, true); assert.match(f.motiv, /frâna zilei e trasă: 8 boți porniți azi \(pragul: 7\)/);
  const z = c.acAziNuDin({ frana: { activa: true, netZi: -25, praguri: { zi: 20 }, depasit: [{ cod: "zi", text: "azi −25,00 USDT (pragul tău: −20)" }] } });
  assert.match(z.motiv, /azi −25,0[\s ]USDT \(pragul tău: −20\)/); assert.doesNotMatch(z.motiv, /25,00/);   /* sumele frânei cu o zecimală */
  const v = c.acAziNuDin({ vreme: { nivel: "miscare", inMiscare: 52, total: 100 } }); assert.equal(v.nu, true); assert.match(v.motiv, /piața e în MIȘCARE \(52 din 100 de monede/);
  const t = c.acAziNuDin({ pauzaN: 3, frana: { activa: true, depasit: [{ text: "3 boți pe minus la rând (pragul: 3)" }] }, vreme: { nivel: "miscare", inMiscare: 60, total: 100 } });
  assert.deepEqual(JSON.parse(JSON.stringify(t.motive.map((x) => x.cod))), ["frana", "pauza", "piata"]);
  assert.match(c.acAziNuHtml(t), /Azi nu:/); assert.equal(c.acAziNuHtml({ nu: false }), "");
});
await test("I-824.2 acAziNu ia frâna de unde o ia cardul „Boții tăi” (contTot.inchise + boții activi + pragurile din config) și piața din clasament", () => {
  const c = cuAcasa({ contTot: { inchiseOk: true, inchise: pierderi(3), boti: [] }, acasa: { d: { franaCfg: null, clasament: CL_LINISTE } } });
  const r = c.acAziNu(ACUM); assert.equal(r.nu, true, JSON.stringify(r)); assert.equal(r.motive[0].cod, "frana"); assert.match(r.motiv, /3 boți pe minus la rând/);
  const c2 = cuAcasa({ contTot: { inchiseOk: true, inchise: [], boti: [] }, acasa: { d: { clasament: CL_MISCARE } } });
  const r2 = c2.acAziNu(ACUM); assert.equal(r2.nu, true); assert.equal(r2.motive[0].cod, "piata");
  const c3 = cuAcasa({ contTot: { inchiseOk: true, inchise: [], boti: [] }, acasa: { d: { clasament: CL_LINISTE } } });
  assert.equal(c3.acAziNu(ACUM).nu, false);
  const c4 = cuAcasa({ contTot: { inchiseOk: false, inchise: [], boti: null }, acasa: { d: {} } });   // nimic citit ⇒ nu inventează un „nu”
  assert.equal(c4.acAziNu(ACUM).nu, false);
});
await test("I-824.3 „Ce aș cumpăra azi”: sub „azi nu” lista rămâne la vedere, fără bold și fără „Pe ce aș porni”; fără „nu” rămâne ca înainte", () => {
  const c = cuAcasa(), d = { clasament: CL_LINISTE };
  const nu = c.acasaCumpar(d, c.acAziNuDin({ frana: { activa: true, depasit: [{ text: "8 boți porniți azi (pragul: 7)" }] } }));
  assert.match(text(nu), /Azi nu: frâna zilei e trasă: 8 boți porniți azi/); assert.match(text(nu), /STX, LIT, CC/);
  assert.doesNotMatch(nu, /<b>STX/); assert.doesNotMatch(nu, />Pe ce aș porni un bot</); assert.match(nu, />Lista candidatelor</);
  const da = c.acasaCumpar(d, { nu: false, motive: [] });
  assert.match(da, /<b>STX, LIT sau CC<\/b>/); assert.match(da, />Pe ce aș porni un bot</); assert.doesNotMatch(da, /Azi nu/);
});
await test("I-824.4 „Idei de azi”: monedele liniștite rămân, sub „azi nu”", () => {
  const c = cuAcasa(), cl = c.acClasamentSumar(CL_LINISTE);
  const nu = c.acIdeiHtml({}, cl, c.acAziNuDin({ pauzaN: 3 }));
  assert.match(text(nu), /Azi nu: 3 pierderi la rând/); assert.match(text(nu), /STX/); assert.match(text(nu), /azi nu pornesc/);
  const da = c.acIdeiHtml({}, cl, { nu: false }); assert.doesNotMatch(da, /Azi nu/); assert.match(da, /Monede liniștite pentru un bot grid/);
});
await test("I-824.5 Sugestii: cu „azi nu” lista de pornire NU se golește (nici la pauză); titlul și rândul de sub el spun „azi nu: <motiv>”", () => {
  const ctx = vm.createContext({ console, escapeHtml: esc, Idei: { ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 5) }, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, Promise, TextRo: globalThis.TextRo,
    acAziNu: () => ({ nu: true, motiv: "3 pierderi la rând (pauza sezonului)", motive: [{ cod: "pauza", text: "3 pierderi la rând (pauza sezonului)" }] }), acPauzaSezon: () => 3, acFrazaPauza: () => "pauza", navTo() {}, window: null });
  for (const f of ["latime.js", "reveniri.js", "sugestii-ecran.js"]) vm.runInContext(lib(f), ctx, { filename: f });
  const D = { clasament: CL_LINISTE };
  const l = JSON.parse(JSON.stringify(ctx.sugRanduri(D, ACUM))).filter((x) => x.grup === "porn");
  assert.ok(l.length >= 3, "lista rămâne: " + l.length);
  const g = JSON.parse(JSON.stringify(ctx.sugGrupuri(D, ACUM))).filter((x) => x.k === "porn")[0];
  assert.match(g.sub, /^azi nu: 3 pierderi la rând/); assert.doesNotMatch(g.titlu, /Pe ce aș porni/); assert.match(g.titlu, /azi nu/);
  const h = ctx.sugListaHtml(D, ACUM); assert.match(h, /sugRand sugAziNu/); assert.match(text(h), /azi nu: 3 pierderi la rând/);
});
await test("I-824.6 toate locurile care propun o pornire cheamă aceeași regulă: Tabloul (caseta + pregătirea), Scanner, antetul Sugestii; Sugestii aduce boții închiși", () => {
  const t212 = lib("t212-ecran.js"), scan = lib("scan-ecran.js"), pz = lib("asezare-paznic.js"), sug = lib("sugestii-ecran.js");
  assert.match(taie(t212, "tbIdeiRender", "t212-ecran.js"), /acAziNu\(\)/);
  assert.match(fnApp("tbPregatire"), /acAziNu\(\)/); assert.doesNotMatch(fnApp("tbPregatire"), /Piața e în mișcare: aș aștepta liniștea/);
  assert.match(scan, /acAziNu\(\)/); assert.doesNotMatch(scan, /pzC > 0 \?/);
  assert.match(pz, /function pagSugestii\(\)[\s\S]{0,900}acAziNu\(\)/);
  assert.match(taie(sug, "sugPorneste", "sugestii-ecran.js"), /contTotAsigura\(\)/);
  assert.match(CSS, /\.aziNuRand\{/);
});

// ================================================================ I-826
const scor = () => { const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, TextRo: globalThis.TextRo }); vm.runInContext(lib("scor-sezon.js"), ctx); return ctx.ScorSezon; };
await test("I-826.1 scorul: raport = câștigul mediu ÷ pierderea medie (0,33) ⇒ „o pierdere = 3,0 câștiguri”; mii cu punct; fără Win / Loss", () => {
  const S = scor();
  // 46 de câștiguri (309,0) și 34 de pierderi (−678,6), din captură: câștigul mediu 6,72, pierderea medie 19,96 ⇒ raport 0,34
  const l = [];
  for (let i = 0; i < 46; i++) l.push({ id: "w" + i, inchis: Date.UTC(2026, 9, 27) + i * 3600000, rezultat: 309 / 46 });
  for (let i = 0; i < 34; i++) l.push({ id: "l" + i, inchis: Date.UTC(2026, 9, 29) + i * 3600000, rezultat: -678.6 / 34 });
  for (let i = 0; i < 2401; i++) l.push({ id: "v" + i, inchis: Date.UTC(2026, 5, 1) + i * 3600000, rezultat: i % 2 ? 4 : -6.7 });
  const s = S.calc(l, { start: Date.UTC(2026, 9, 25) }, ACUM, "pionex");
  assert.ok(Math.abs(s.raport - (309 / 46) / (678.6 / 34)) < 1e-9);
  const h = text(S.html(s, {}));
  assert.match(h, /o pierdere = 3,0 câștiguri/, h.slice(0, 600)); assert.doesNotMatch(h, /o pierdere = 0,3/);
  assert.match(h, /din 2\.401 boți/); assert.match(h, /−\d{1,3}\.\d{3},\d USDT/, "netul de dinainte, cu mii");
  assert.doesNotMatch(h, /\bWin\b|\bLoss\b/); assert.match(h, /Pe plus/); assert.match(h, /Pe minus/);
  const ist = text(S.htmlIstoric([{ start: 1, sfarsit: 2, curent: false, n: 2401, win: 1300, loss: 1101, rata: 0.54, net: -6430.94, seriePierderi: 9, moneda: "USDT" }, { start: 3, sfarsit: null, curent: true, n: 3, win: 1, loss: 2, rata: 0.33, net: 1, seriePierderi: 1, moneda: "USDT" }], "pionex"));
  assert.match(ist, /−6\.430,9 USDT/); assert.doesNotMatch(ist, /\bWin\b|win \/ loss/);
});
await test("I-826.2 TextRo.cate scrie numărul mare cu punct („2.401 boți”, „1.500 de boți”); sub 1.000 neschimbat", () => {
  assert.equal(TextRo.cate(2401, "bot", "boți"), "2.401 boți");
  assert.equal(TextRo.cate(1500, "bot", "boți"), "1.500 de boți");
  assert.equal(TextRo.cate(20, "bot", "boți"), "20 de boți"); assert.equal(TextRo.cate(1, "bot", "boți"), "1 bot"); assert.equal(TextRo.cate(999, "caz", "cazuri"), "999 de cazuri");
  assert.equal(TextRo.cate(-1200, "zi", "zile"), "−1.200 de zile");
  assert.equal(TextRo.usdt(-6430.94, 1), "−6.430,9 USDT"); assert.equal(TextRo.num(1234.5), "1.234,5"); assert.equal(TextRo.num(999.94), "999,9"); assert.equal(TextRo.num(-0.04), "0,0");
  assert.equal(TextRo.usdt(12345), "+12.345,0 USDT"); assert.equal(TextRo.num(1500, 0), "1.500");
});

// ================================================================ fără bot
await test("FB.1 Comportament: raport vechi și NICIUN bot ⇒ „Niciun bot pornit” (+ ultimul închis), nu „colectorul pare oprit”; cu boți rămâne avertismentul", () => {
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, document: { getElementById: () => null } });
  vm.runInContext(lib("comportament-ecran.js"), ctx);
  const r = { forma: 1, la: ACUM - 3 * 3600000, evaluari: [], azi: null };
  const h = text(ctx.coHtml(r, { acum: ACUM, botiActivi: 0, ultimInchis: "XMR long 5× −2,1 USDT · joi 11:19" }));
  assert.doesNotMatch(h, /colectorul pare oprit/); assert.match(h, /Niciun bot pornit acum/); assert.match(h, /ultimul închis: XMR long 5× −2,1 USDT/);
  assert.match(text(ctx.coHtml(r, { acum: ACUM, botiActivi: 2 })), /colectorul pare oprit/);
});
await test("FB.2 Tabloul fără bot: „Ce ai de făcut acum” nu mai rămâne „Aștept botul…”; cardul unic spune ultimul bot și duce la Grid", () => {
  const el = {}, ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, escapeHtml: esc, $: (id) => (el[id] = el[id] || { id, innerHTML: "", hidden: false, classList: { toggle() {} } }),
    tbStare: { routeOk: true, bot: null, boti: [] }, acUltimInchisText: () => "XMR long 5× −2,1 USDT · joi 11:19", document: { getElementById: (id) => el[id] || null } });
  vm.runInContext(["tbTextFaraBot", "renderTabloSfaturi", "tbRenderTodo", "tbFaraBotHtml"].map(fnApp).join("\n"), ctx);
  ctx.renderTabloSfaturi();
  assert.doesNotMatch(el.tbTodoLista.innerHTML, /Aștept botul/); assert.match(el.tbTodoLista.innerHTML, /Niciun bot/);
  const card = ctx.tbFaraBotHtml();
  assert.match(text(card), /Niciun bot pornit · ultimul: XMR long 5× −2,1 USDT/); assert.match(card, /navTo\('gridset',true\)/); assert.match(text(card), /Grid: ce setez\? →/);
  assert.match(IDX, /id="tbFaraBotCard"/); assert.match(CSS, /#tabloubot\.tbFaraBot \.tbSus/); assert.match(CSS, /#tabloubot\.tbFaraBot #tbGraficCard>:not\(#pzUltimii\)/);
  assert.match(fnApp("renderTabloBot"), /tbFaraBot/);
});
await test("FB.3 „Acum” pe telefon (asezare-paznic): fără boți spune „Niciun bot pornit acum” și ultimul închis, nu textul de așteptare al Tabloului", () => {
  const s = lib("asezare-paznic.js"), i = s.indexOf("  function frazaAcum("), j = s.indexOf("\n  }\n", i);
  assert.ok(i > 0 && j > i, "frazaAcum lipsește");
  const ctx = vm.createContext({}); vm.runInContext(s.slice(i, j + 4) + ";this.f=frazaAcum;", ctx);
  assert.equal(ctx.f({ routeOk: true }, [], "Aștept botul…", true, "XMR −2,1 USDT"), "Niciun bot pornit acum · ultimul închis: XMR −2,1 USDT.");
  assert.equal(ctx.f({ routeOk: true }, [], "", false, ""), "Niciun bot pornit acum.");
  assert.equal(ctx.f({ routeOk: true }, [{ id: 1 }], "Închide botul", false, ""), "Închide botul");
  assert.equal(ctx.f({ routeOk: true }, [{ id: 1 }], "Aștept botul…", true, ""), "Deschide Tabloul botului pentru ce ai de făcut.");
  assert.equal(ctx.f({}, [], "", false, ""), "Citesc boții…");
});

// ================================================================ I-836
const gridCtx = () => {
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, escapeHtml: esc, TextRo: globalThis.TextRo });
  for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js"]) vm.runInContext(lib(f), ctx, { filename: f });
  vm.runInContext(["grAlege", "grPlanVarHtml", "grRand", "grPret", "grFmt", "grZec"].map(fnApp).join("\n"), ctx);
  return ctx;
};
const varianta = (media, stop, o) => Object.assign({ dir: "long", jos: 0.33, sus: 0.36, grile: 26, levier: 1, pas: 0.003, cum: "banda", laStop: -2.8, laTinta: 1.4, stop: { jos: 0.329, sus: 0.361 }, lichidare: { jos: null, sus: null },
  proba: { n: 109, stop, tinta: 109 - stop, inGrid: 0, ferestreZile: 3, zile: 30, oreTipic: 9, mediaUsdt: media, ceaMaiProastaUsdt: -2.8, independente: 10 } }, o || {});
await test("I-836.1 fișa Grid: ÎNGUST și LARG amândouă cu media pe minus ⇒ „nicio variantă nu câștigă”, fără „aș alege-o acum”; o medie pe plus ⇒ alegerea rămâne", () => {
  const c = gridCtx();
  const pv = { ta: varianta(-1.0, 69, { levier: 4 }), mea: varianta(-0.9, 70), plan: { plus: 1.4, minus: 2.8, afaraOre: 12 }, amp: 0.083 };
  const r = c.grAlege(pv.ta, pv.mea); assert.equal(r.niciuna, true); assert.equal(r.asteapta, true);
  const h = c.grPlanVarHtml(pv, null, "", true), t = text(h);
  assert.match(t, /Ce aș alege eu acum: nicio variantă nu câștigă/); assert.match(t, /−1,0 USDT la ÎNGUST și −0,9 USDT la LARG/);
  assert.doesNotMatch(h, /aș alege-o acum/); assert.doesNotMatch(t, /Ce aș alege eu acum: LARG/);
  const pv2 = { ta: varianta(-1.0, 69, { levier: 4 }), mea: varianta(0.4, 40), plan: pv.plan, amp: 0.083 };
  assert.equal(!!c.grAlege(pv2.ta, pv2.mea).niciuna, false); assert.match(c.grPlanVarHtml(pv2, null, "", true), /aș alege-o acum/);
  assert.match(fnApp("grRecomandatAcum"), /grAlege\(/); assert.match(fnApp("grFerestreTine"), /grAlege\(/);
});
await test("I-836.2 fișa Grid pe telefon: după „Calculează” formularul se strânge într-un rând (cu tot ce ai ales) și pagina sare la verdict", () => {
  const ctx = vm.createContext({ grStare: { H: 2, dir: null }, String, Number });
  vm.runInContext(fnApp("grFormRezumat"), ctx);
  assert.equal(ctx.grFormRezumat({ moneda: "stx", suma: "100", lev: "", H: 2, dir: null }), "STX · 100 USDT · 2 zile · din trend · levier propus");
  assert.equal(ctx.grFormRezumat({ moneda: "PEPE", suma: "250", lev: "3", H: 1, dir: "short" }), "PEPE · 250 USDT · 1 zi · short · 3×");
  const g = fnApp("gridCalculeaza"); assert.match(g, /grStrangeForm\(/); assert.match(fnApp("grStrangeForm"), /\.grVerdict/);
  assert.match(IDX, /id="grFormStrans"/); assert.match(CSS, /#gridset \.grIntrari\.grStrans>:not\(#grFormStrans\)\{display:none\}/);
});
await test("I-836.3 Futures (deriv) pe pagina nouă: fără bara veche de analiză deasupra", () => {
  assert.match(APP, /classList\.toggle\("pePaginaNoua",\[[^\]]*"deriv"[^\]]*\]\.includes\(id\)\)/);
});
await test("I-836.4 Alerte: cel mult 50 de rânduri, pe zile, restul la un clic; pe telefon „Doar importante” pornit; „info” cu punct neutru", () => {
  const el = {}, ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, escapeHtml: esc, innerWidth: 412, localStorage: { getItem: () => null, setItem() {} },
    $: (id) => (el[id] = el[id] || { id, innerHTML: "" }), setInterval() {}, setTimeout() {}, document: { addEventListener() {}, hidden: false }, getJSON: async () => ({ alerte: [] }), navTo() {} });
  vm.runInContext(lib("alerte-ecran.js"), ctx);
  const l = Array.from({ length: 1413 }, (_, i) => ({ t: ACUM - i * 600000, nivel: i % 7 === 0 ? "atentie" : "info", cheie: "grila-" + i, titlu: "alerta " + i }));
  ctx.alSt.l = l; ctx.alDeseneaza();
  let h = el.alCentru.innerHTML; const n = (h.match(/class="alRand /g) || []).length;
  assert.ok(n > 0 && n <= 50, "rânduri: " + n); assert.match(h, /id="alImp" checked/); assert.match(h, /data-altot="1"/); assert.match(h, /class="alZi"/);
  assert.ok(!/class="alRand info/.test(h), "pe telefon, implicit doar importante");
  ctx.alSt.imp = false; ctx.alSt.toate = true; ctx.alDeseneaza(); h = el.alCentru.innerHTML;
  assert.equal((h.match(/class="alRand /g) || []).length, 1413, "la un clic: toate (nimic șters)");
  assert.match(CSS, /#alerts \.alPunct\{[^}]*background:var\(--muted\)/); assert.match(CSS, /#alerts \.alRand\.critic \.alPunct\{background:var\(--bad\)\}/);
});
await test("I-836.5 Range Filter: cartela fără verde / roșu de verdict, „colorant de trend (nedovedit)”, „AȘTEAPTĂ”, numărătoarea corectă", () => {
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, TextRo: globalThis.TextRo, document: { getElementById: () => null } });
  vm.runInContext(lib("range-filter.js"), ctx); vm.runInContext(lib("range-filter-ecran.js"), ctx);
  const c = { dir: -1, bareDir: 2, regim: { cons: false, ang: -12, consPct: 50 }, dovada: { n: 0, k: 0 }, cost: 0.001, semnalAcum: true, semnal: { fel: "SELL", acum: 0, pret: 1 }, costNu: false, trigger: { text: "x" }, distPct: 0.01, distAtr: -1, bandAtr: 1, bandMed: 1, ma: { col: -1, distAtr: -1, aliniata: true }, aprindere: null, dupaCost: null, sigPer100: 2, tinere: 30, whipPct: 1, n: 500 };
  const t = ctx.rfTexte(c, 1.96);
  assert.equal(t.ton, "fara"); assert.equal(t.triggerTon, "fara"); assert.equal(t.semnalTon, "fara");
  assert.match(lib("range-filter-ecran.js"), /colorant de trend \(nedovedit\)/);
  assert.doesNotMatch(lib("range-filter.js"), /ASTEAPTA/); assert.match(lib("range-filter.js"), /AȘTEAPTĂ/);
  const mon = Array.from({ length: 20 }, (_, i) => ({ simbol: "M" + i, fel: "piata", c: { dir: -1, regim: { cons: i < 2 }, semnal: null } }));
  const r = text(ctx.rfRezumat(mon));
  assert.doesNotMatch(r, /0 din 20 în trend sus/); assert.match(r, /Din 20 de monede: niciuna în trend sus, 20 în trend jos; 2 dintre ele în consolidare\./);
});
await test("I-836.6 lărgimea pieței nu mai cere acțiunile tokenizate (CRCLX, GOOGLX) la Binance", () => {
  const f = APP.slice(APP.indexOf("async function refreshMarketBreadthV64("), APP.indexOf("\nfunction v64BreadthAlignment("));
  assert.match(f, /GridCalcul\.eCrypto\(/);
});

// ================================================================ mărunte
await test("M.1 țintele mici de pe telefon (Jurnal ›, Obiectiv ✎, Fiecare zi) au cel puțin 32 px; cele două „Profile” din sertar au nume diferite", () => {
  assert.match(CSS, /@media \(max-width:760px\),\(pointer:coarse\)\{\.scCap \.actionGhost\{min-height:32px/);
  assert.match(CSS, /#dash \.acZileTab>summary\{min-height:32px/);
  const sertar = IDX.slice(IDX.indexOf('id="moreDrawer"'));
  assert.match(sertar, /moreNav\('profile',true\)"><b>▤<\/b>Volume Profile</); assert.match(sertar, /moreNav\('profilelab',true\)"><b>▥<\/b>Market Profile</);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
