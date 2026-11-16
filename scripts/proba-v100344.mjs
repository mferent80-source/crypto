// Proba v100.344 (16.11.2026, el: „audităm sever pagina sugestii, aplicăm modificările din paginile refăcute, optimizăm procesele și verdictele;
// pare că are mereu aceleași sugestii”). Auditul (2 revizori Opus + datele vii de pe VPS) ⇒ partea 1, ADEVĂRUL paginii:
//   1. bilanțul Trend 12 luni nu mai e aruncat tăcut când robotul își schimbă `versiune` (din 31.10 e un hash) și se retrimite când e nou;
//   2. fiecare listă de acțiuni își spune data și „VECHE” peste 30 de ore (luni, „închiderea de ieri” era vineri);
//   3. cât se încarcă: „se încarcă…”, nu „nimic acum”; o sursă picată: „n-am putut aduce …”;
//   4. celulele verdictelor din DATE (Sectoare: istoricul viu, nu „+1,1%” scris de mână), „puține” sub 8 ferestre;
//   5. nota de jos nu mai promite urmărire „față de piață” pentru toate listele; „6 luni” la Trend = fără ultima lună; convențiile.
//   node scripts/proba-v100344.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { trendDinJson, turaTrend } from "./lib/tura-trend.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.344 · Sugestii: adevărul paginii · proba\n");

const SUG = citeste("public", "lib", "sugestii-ecran.js");
function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + SUG + "\nthis.sugHtml = sugHtml; this.sugRanduri = sugRanduri; this.sugStare = sugStare; this.sugGrupuri = sugGrupuri; this.sugFisa = sugFisa; this.sugVerdicteHtml = sugVerdicteHtml; this.sugListaHtml = sugListaHtml;", ctx);
  return ctx;
}
const ACUM = Date.parse("2026-11-16T07:40:00Z");   // luni dimineața
const TOP = (n) => Array.from({ length: n }, (_, i) => ({ s: "T" + i, nume: "Firma " + i, sector: "Technology", pret: 10 + i, m12: 1.2, m6: 0.87, r60: 0.2, rang: 0.01 * i }));
const ROBOT = () => ({ versiune: 1, dataUltimei: "2026-11-13", regim: { peste: true, inchidere: 750, sma200: 730 }, sectoare: { Technology: 11 }, raportari: { sursa: "finnhub" }, intrari: ["T1"], iesiri: [], clasament: TOP(20) });
const BIL_NOU = { versiune: "tc-268dd7fd71ef", la: "2026-11-14T14:25:56.965Z", de: "2026-10-15", pana: "2026-11-13", zile: 22, n20: 2, n60: 0, exces20: -15.29, nulB20: 3.3, diferenta20: { medie: -18.59, interval: [-18.59, -18.59] }, ferestre20: 1, t20: null, pragT: 3.2, abatere: null, verdict: "în probă" };

// ── 1. bilanțul Trend ──
await test("🔑 bilanțul robotului cu `versiune` hash (forma de după 31.10) e citit, nu aruncat", () => {
  const t = trendDinJson(ROBOT(), BIL_NOU, ACUM);
  assert.ok(t.bilant, "bilanțul a fost aruncat");
  assert.equal(t.bilant.n20, 2); assert.equal(t.bilant.ferestre20, 1); assert.equal(t.bilant.diferenta20.medie, -18.59); assert.equal(t.bilant.la, "2026-11-14T14:25:56.965Z");
});
await test("bilanțul fără câmpurile știute ⇒ { forma: \"necunoscuta\" }, nu null (pagina spune de ce lipsește)", () => {
  const t = trendDinJson(ROBOT(), { versiune: 9, ceva: 1 }, ACUM);
  assert.deepEqual(t.bilant, { forma: "necunoscuta" });
  assert.equal(trendDinJson(ROBOT(), null, ACUM).bilant, null);
});
await test("🔑 aceeași zi de date dar bilanț nou (sâmbăta) ⇒ tura retrimite", async () => {
  const trimise = [], st = { dataUltimei: "2026-11-13", bilantLa: "2026-11-07T10:00:00Z" };
  const d = { acum: ACUM, forta: true, jurnal() {}, trimite: async (c, b) => { trimise.push(c); return { ok: true }; },
    fetch: async (u) => ({ ok: true, json: async () => (/bilant/.test(u) ? BIL_NOU : ROBOT()) }) };
  await turaTrend(d, st);
  assert.ok(trimise.some((c) => /trend12/.test(c)), "n-a retrimis bilanțul nou: " + trimise.join(","));
  assert.equal(st.bilantLa, BIL_NOU.la);
  trimise.length = 0; st.zi = null; await turaTrend(d, st);
  assert.ok(!trimise.some((c) => /trend12/.test(c)), "a retrimis același bilanț");
});
await test("pagina: bilanț de formă necunoscută / lipsă se spune exact; bilanțul adevărat apare în celula verdictului", () => {
  const p = pagina();
  const cu = p.sugVerdicteHtml({ trend12: Object.assign(trendDinJson(ROBOT(), BIL_NOU, ACUM), { la: ACUM }) });
  assert.match(cu, /2 zile cu rezultat/); assert.match(cu, /−18,6% vs alte acțiuni/);
  const nec = p.sugVerdicteHtml({ trend12: Object.assign(trendDinJson(ROBOT(), { versiune: 9 }, ACUM), { la: ACUM }) });
  assert.match(nec, /bilanțul robotului are o formă necunoscută/);
  const lip = p.sugVerdicteHtml({ trend12: Object.assign(trendDinJson(ROBOT(), null, ACUM), { la: ACUM }) });
  assert.match(lip, /bilanțul robotului lipsește/); assert.doesNotMatch(lip, /0 zile cu rezultat/);
});

// ── 2. data și „VECHE” ──
const IDEI = (la, zi) => ({ idei: { idei: { la, zi, judecate: 203, reveniri: [{ ticker: "AXON_US_EQ", simbol: "AXON", pret: 315.43, cadere: 0.5, deLaMin: 0.08, zileDeLaMin: 3, stop: 288.54, tinta: 636.36, istoric: { n: 0, pePlus: 0, total: 0 } }] } } });
await test("🔑 lista US își spune data turei și închiderea (vineri, luni dimineața), iar peste 30 de ore e VECHE", () => {
  const p = pagina(); p.sugStare.vedere = "sugestii";
  const g = p.sugGrupuri(IDEI(Date.parse("2026-11-16T06:05:00Z"), "2026-11-16"), ACUM, "sugestii").filter((x) => x.k === "revUS")[0];
  assert.match(g.sub, /închiderea din 13\.11/); assert.doesNotMatch(g.sub, /VECHE/);
  const v = p.sugGrupuri(IDEI(Date.parse("2026-11-14T06:05:00Z"), "2026-11-14"), ACUM, "sugestii").filter((x) => x.k === "revUS")[0];
  assert.match(v.sub, /VECHE/);
  const f = p.sugFisa(p.sugRanduri(IDEI(Date.parse("2026-11-16T06:05:00Z"), "2026-11-16"), ACUM, "sugestii")[0], IDEI(Date.parse("2026-11-16T06:05:00Z"), "2026-11-16"), ACUM);
  assert.doesNotMatch(f.pretNota, /de ieri/); assert.match(f.pretNota, /13\.11/);
});
await test("sectoarele și trendul își spun data; sectoarele vechi de peste 30 de ore sunt VECHI", () => {
  const p = pagina();
  const S = { la: Date.parse("2026-11-14T06:00:00Z"), univers: 235, istoric: { luni: 9, medie: -0.0062, luniPlus: 4, n: 9 }, sectoare: [{ ro: "Tehnologie", etf: "XLK", n: 24, top: [{ s: "AAPL", nume: "Apple", r3: 0.1, r6: 0.2, peste3: 0.01, peste6: 0.02, max52: -0.02, pret: 230 }] }] };
  const g = p.sugGrupuri({ sectoare: S }, ACUM, "sugestii").filter((x) => x.k === "sect")[0];
  assert.match(g.sub, /VECHE/); assert.match(g.sub, /235 de firme/);
});

// ── 3. se încarcă / n-am putut aduce ──
await test("🔑 cât se încarcă, lista spune „se încarcă”, nu „nimic acum” / „Nicio sugestie acum.”", () => {
  const p = pagina(); p.sugStare.vedere = "sugestii"; p.sugStare.inLucru = true;
  const h = p.sugListaHtml({}, ACUM);
  assert.doesNotMatch(h, /nimic acum/); assert.doesNotMatch(h, /Nicio sugestie acum/); assert.match(h, /se încarcă/i);
  p.sugStare.inLucru = false;
  const e = p.sugListaHtml({ erori: { idei: "fetch failed" } }, ACUM);
  assert.match(e, /n-am putut aduce/i);
});

// ── 4. celulele verdictelor din date ──
await test("🔑 celula Sectoare arată istoricul VIU (−0,6% pe lună, 4 din 9), nu „+1,1%” scris de mână", () => {
  const p = pagina();
  const h = p.sugVerdicteHtml({ sectoare: { la: ACUM, istoric: { luni: 9, medie: -0.0062, luniPlus: 4, n: 9 }, sectoare: [] } });
  assert.match(h, /−0,6% pe lună/); assert.match(h, /4 din 9 luni/); assert.doesNotMatch(h, /\+1,1% pe lună/);
});
await test("celula „Pe ce aș porni”: sub 8 ferestre spune că sunt puține, nu doar „100% din zile”", () => {
  const p = pagina();
  const h = p.sugVerdicteHtml({ sugMonede: { sugestii: { urmarire: { porn: { n: 20, zile: 5, ferestre: 1, exces: 0.032, zilePeste: 1, text: "Din 20 de sugestii (5 zile) … (peste piață în 100% din zile)" } } } } });
  assert.match(h, /1 fereastră/); assert.match(h, /puține/);
});

// ── 5. nota, „6 luni”, convenții ──
await test("nota de jos nu promite urmărire față de piață pentru toate listele", () => {
  const p = pagina(); p.sugStare.vedere = "sugestii";
  const h = p.sugHtml({}, ACUM);
  assert.doesNotMatch(h, /iar urmărirea înainte e la orizont fix, numărată pe zile, față de piața din aceleași zile/);
});
await test("Trend: „6 luni” se numește „6 luni, fără ultima”; „raportează în 8 zile”, nu „8z”", () => {
  const p = pagina();
  const T = Object.assign(trendDinJson(ROBOT(), BIL_NOU, ACUM), { la: ACUM });
  T.top[0].raporteaza = { d: "2026-11-24", ora: "amc" };
  const r = p.sugRanduri({ trend12: T }, ACUM, "sugestii").filter((x) => x.grup === "trend")[0];
  assert.match(r.sub, /6 luni, fără ultima/); assert.doesNotMatch(r.nume, /\d+z\b/); assert.match(r.nume, /raportează în 8 zile/);
  const f = p.sugFisa(r, { trend12: T }, ACUM);
  assert.ok(f.cele.some((c) => /fără ultima/.test(c.et)));
});
await test("revenire: fără istoric al tău nu scrie „0 trade-uri ale tale, 0 pe plus, 0 lei”", () => {
  const p = pagina(); const d = IDEI(ACUM - 3600000, "2026-11-16");
  const r = p.sugRanduri(d, ACUM, "sugestii")[0];
  assert.doesNotMatch(r.sub, /0 trade-uri/);
});

// ── 6. „Pe ce aș porni” pe pagină: costurile de acum, „nou față de ieri” (partea 2) ──
function paginaCuIdei() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "grid-calcul.js") + "\n" + citeste("public", "lib", "idei.js") + "\n" + SUG + "\nthis.sugRanduri = sugRanduri; this.sugGrupuri = sugGrupuri; this.sugFisa = sugFisa; this.sugStare = sugStare; this.GridCalcul = GridCalcul;", ctx);
  return ctx;
}
const MON = (s, o) => Object.assign({ simbol: s + "_USDT_PERP", stare: "candidat", dir: "short", tarie: "tare", volum: 5e6, scor: 0.001, f7: 0.002, pret: 10, latime: 0.08, pas: 0.003, grile: 28, profitGrila: 0.0026, traversariZi: 12, regim: { r4h: 0.5, r24h: 0.3, miscare: false, s24h: 0.004, mr: 0.1 } }, o);
const CL = { la: ACUM - 600000, monede: [MON("HYPE", { scor: 0.0016, f7: 0.0018 }), MON("LTC", { scor: 0.0013 }), MON("XRP", { scor: 0.0012 }), MON("AKE", { dir: "neutru", scor: 0.0011, f7: null }), MON("LIT", { volum: 0.8e6, scor: 0.003 })] };
const NOTE = [["2026-11-14", ["LIT", "HYPE"]], ["2026-11-15", ["LIT", "HYPE", "PENDLE"]]].flatMap(([zi, l]) => l.map((s) => ({ zi, simbol: s + "_USDT_PERP", lista: "porn", dir: "short" })));
await test("🔑 grupul spune regula nouă: câți lichizi, câți sub 1 M, câți săriți ca același pariu", () => {
  const p = paginaCuIdei();
  const g = p.sugGrupuri({ clasament: CL }, ACUM, "sugestii").filter((x) => x.k === "porn")[0];
  assert.match(g.sub, /1 M USDT\/zi/); assert.match(g.sub, /1 sub prag/); assert.match(g.sub, /cel mult 2 pe aceeași direcție/); assert.match(g.sub, /1 sărit/);
});
await test("🔑 rândul: „nou față de ieri” sau „în listă N din ultimele M zile” din notările colectorului; câștigul estimat și funding-ul", () => {
  const p = paginaCuIdei();
  const l = p.sugRanduri({ clasament: CL, sugMonede: { istoric: NOTE } }, ACUM, "sugestii").filter((r) => r.grup === "porn");
  const hype = l.filter((r) => r.s === "HYPE")[0], ltc = l.filter((r) => r.s === "LTC")[0];
  assert.match(hype.sub, /în listă 2 din ultimele 2 zile/); assert.match(ltc.sub, /nou față de ieri/);
  assert.match(hype.sub, /7 z ~\+1,2%/);   // short: 7 × 0,0016 + 0,5 × 0,0018 = 1,12% + 0,09% = 1,21%
  assert.ok(!l.some((r) => r.s === "LIT"), "LIT sub 1 M a intrat");
});
await test("fișa: celulele „Câștig estimat 7 z” și „Funding 7 z”; funding necitit ⇒ avertisment, nu 0", () => {
  const p = paginaCuIdei(), d = { clasament: CL, sugMonede: { istoric: NOTE } };
  const l = p.sugRanduri(d, ACUM, "sugestii").filter((r) => r.grup === "porn");
  const f = p.sugFisa(l.filter((r) => r.s === "HYPE")[0], d, ACUM);
  assert.ok(f.cele.some((c) => c.et === "Câștig estimat 7 z" && /\+1,2%/.test(c.v)));
  assert.ok(f.cele.some((c) => c.et === "Funding 7 z" && /\+0,18%/.test(c.v)));
  assert.match(f.regula, /cel mult 2 pe aceeași direcție/);
  const ake = p.sugFisa(l.filter((r) => r.s === "AKE")[0], d, ACUM);
  assert.ok(ake.avert.some((a) => /funding-ul n-a putut fi citit/i.test(a)));
});

// ── 7. urmăririle noi pe pagină (partea 3) ──
const SA_URM = { la: ACUM - 3600000, zi: "2026-11-16", us: { judecate: 200, fara: 1 }, eu: { judecate: 134, fara: 4, revine: [{ ticker: "SU.PA", simbol: "SU", pret: 243.45, cadere: 0.2, deLaMin: 0.09, zileDeLaMin: 2, stop: 221.22, tinta: 304.85 }], dovada: { revine: { text: "istoric EU" } } },
  urmarire: { us: { revine: { n: 12, zile: 4, text: "Din 12 semnale (4 zile) la 10 zile de bursă … față de QQQ din aceleași zile −1,2 pp" } }, eu: { revine: { n: 0, text: "Semnalele se judecă la 10 zile de bursă după intrare, față de Euro Stoxx 50 (EXW1), după 0,3%: încă niciunul ajuns la capăt." } } } };
await test("🔑 fișa EU nu mai promite o urmărire care nu exista: arată urmărirea la orizont fix față de Euro Stoxx 50", () => {
  const p = pagina(), d = { sugActiuni: { sugestii: SA_URM } };
  const r = p.sugRanduri(d, ACUM, "sugestii").filter((x) => x.grup === "revEU")[0], f = p.sugFisa(r, d, ACUM);
  assert.ok(!f.dovada.some((t) => /începe de la prima tură/.test(t)), "promisiunea veche a rămas");
  assert.ok(f.dovada.some((t) => /Euro Stoxx 50/.test(t)));
});
await test("🔑 fișa și celula US arată urmărirea față de QQQ; urmărirea veche „la prețul de azi” rămâne, numită ca atare", () => {
  const p = pagina(), d = Object.assign(IDEI(ACUM - 3600000, "2026-11-16"), { sugActiuni: { sugestii: SA_URM } });
  d.idei.idei.urmarireReveniri = { n: 170, text: "Din 170 de sugestii de cel puțin 14 zile: 45 pe plus, −10,5% în medie" };
  const f = p.sugFisa(p.sugRanduri(d, ACUM, "sugestii").filter((x) => x.grup === "revUS")[0], d, ACUM);
  assert.ok(f.dovada.some((t) => /față de QQQ/.test(t)));
  assert.ok(f.dovada.some((t) => /la prețul de azi/.test(t) && /−10,5%/.test(t)));
  assert.match(p.sugVerdicteHtml(d), /față de QQQ/);
});
await test("„Pe ce aș porni”: regula veche (după scor) e arătată separat de cea nouă", () => {
  const p = paginaCuIdei(), d = { clasament: CL, sugMonede: { istoric: NOTE, sugestii: { urmarire: { porn: { n: 0, text: "Sugestiile se urmăresc de azi" }, pornScor: { n: 20, zile: 5, ferestre: 1, text: "Din 20 de sugestii (5 zile) … prea devreme" } } } } };
  const f = p.sugFisa(p.sugRanduri(d, ACUM, "sugestii").filter((r) => r.grup === "porn")[0], d, ACUM);
  assert.ok(f.dovada.some((t) => /Regula veche \(ordinea după scor, până la 16\.11\)/.test(t)));
});

// ── 7b. el, 16.11 în timpul lucrului: „la interval nu doar procentul, cât și valorile” ──
await test("🔑 intervalul gridului își arată și prețurile (jos – sus), din aceeași GridCalcul.plaseaza ca scorul colectorului", () => {
  const p = paginaCuIdei(), d = { clasament: CL };
  const r = p.sugRanduri(d, ACUM, "sugestii").filter((x) => x.grup === "porn" && x.s === "HYPE")[0];
  const loc = p.GridCalcul.plaseaza(10, 0.08, "short"), fmt = (v) => v.toFixed(v >= 100 ? 1 : v >= 1 ? 2 : 4).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1").replace(".", ",");
  const iv = fmt(loc.jos) + " – " + fmt(loc.sus);
  assert.ok(r.sub.includes("interval 8,0% (" + iv + ")"), r.sub);
  const f = p.sugFisa(r, d, ACUM), c = f.cele.filter((x) => x.et === "Interval")[0];
  assert.ok(c && c.sub.includes(iv), JSON.stringify(c));
});

// ── 8. ca paginile refăcute (partea 4): fraza mare + „De unde știu”, detaliile indicatorilor și TradingView în fișă ──
function paginaToata() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "grid-calcul.js") + "\n" + citeste("public", "lib", "idei.js") + "\n" + SUG + "\nthis.sugHtml = sugHtml; this.sugRanduri = sugRanduri; this.sugStare = sugStare; this.sugIndTf = sugIndTf; this.sugIndInchise = sugIndInchise; this.sugFisaHtml = sugFisaHtml; this.sugFisa = sugFisa; this.sugSurseHtml = sugSurseHtml;", ctx);
  ctx.sugStare.vedere = "sugestii";
  return ctx;
}
await test("🔑 sus: fraza mare cu ce e azi pe pagină și „De unde știu” cu ora fiecărei surse (VECHE / n-am putut aduce, spuse)", () => {
  const p = paginaToata(), d = Object.assign({ clasament: CL, sectoare: { la: ACUM - 2 * 86400000, univers: 235, istoric: {}, sectoare: [] }, erori: { trend12: "fetch failed" } }, IDEI(ACUM - 3600000, "2026-11-16"));
  const h = p.sugHtml(d, ACUM);
  assert.match(h, /class="sugFraza"/); assert.match(h, /3 boți de privit/);   // HYPE, LTC (2 short), XRP sărit, AKE neutru
  assert.match(h, /De unde știu/); assert.match(h, /Clasamentul boților/); assert.match(h, /Sectoarele[^<]*VECHE/); assert.match(h, /Trend 12 luni[^<]*n-am putut aduce/);
  assert.match(h, /Nicio listă de mai jos n-are un avantaj dovedit/, "textul vechi s-a pierdut");
});
await test("🔑 fișa: intervalele detaliilor (monede 15 min / 1 oră / 4 ore / 1 zi; acțiuni 1 oră / 1 zi) și bara în formare scoasă", () => {
  const p = paginaToata();
  assert.deepEqual([...p.sugIndTf({ tip: "moneda" }).map((x) => x[1])], ["15 min", "1 oră", "4 ore", "1 zi"]);
  assert.deepEqual([...p.sugIndTf({ tip: "actiune" }).map((x) => x[1])], ["1 oră", "1 zi"]);
  const acum = Date.parse("2026-11-16T08:10:00Z"), j = [[Date.parse("2026-11-16T07:45:00Z")], [Date.parse("2026-11-16T08:00:00Z")]];
  assert.equal(p.sugIndInchise(j, 15, acum).length, 1);
});
await test("fișa are locurile pentru „Detaliile indicatorilor” și TradingView (se umplu la clic, nu la încărcare)", () => {
  const p = paginaToata(), d = { clasament: CL };
  const r = p.sugRanduri(d, ACUM, "sugestii")[0], h = p.sugFisaHtml(p.sugFisa(r, d, ACUM), r);
  assert.match(h, /Detaliile indicatorilor/); assert.match(h, /TradingView/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
