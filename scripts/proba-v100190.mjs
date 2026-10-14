// Probele v100.190 / colector v101.111 (14.10.2026, el: „da, lasă și Europa, și integrează cum ai zis”): „Trend 12 luni” în Radar —
// tura colectorului citește clasamentul robotului din premarket_scanner, îl pune în KV și trimite primele 20 în jurnalul verdictelor
// (sursa „trend-12-1”); pagina Sugestii îl arată cu eticheta „în probă” și clic spre Poartă.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { trendDinJson, verdicteTrend, turaTrend, SURSA } from "./lib/tura-trend.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.190 · Trend 12 luni în Radar · proba\n");

const ACUM = Date.parse("2026-10-15T06:30:00Z");   // 09:30 ora României
function jsonRobot(extra = {}) {
  return {
    versiune: 1, la: "2026-10-15T00:40:00Z", dataUltimei: "2026-10-14", regim: { inchidere: 780, sma200: 724, peste: true },
    sectoare: { Technology: 11, "Health Care": 4, Energy: 3, Industrials: 2 }, raportari: { sursa: "finnhub", n: 800 },
    iesiri: [{ s: "DOCN", motiv: "a căzut la top 23,0 %" }], intrari: ["ATI"],
    eticheta: "selecție probată față de acțiunile din aceeași zi; neprobată pe listă istorică; în probă — nu e un buton de cumpărat",
    clasament: Array.from({ length: 25 }, (_, i) => ({ s: "T" + i, nume: i === 2 ? "<script>alert(1)</script>" : "Firma " + i, sector: i % 2 ? "Technology" : "Energy", pret: 50 + i, m12: 1.5 - i / 20, m6: 0.4 - i / 50, r60: 0.3 - i / 100, rang: i / 588, spark: [1, 2, 3], ...(i === 1 ? { raporteaza: { d: "2026-10-22", ora: "amc", zile: 8 } } : {}) })),
    ...extra,
  };
}
const bilantRobot = { versiune: 1, zile: 37, n20: 17, n60: 0, ferestre20: 0, exces20: 0.8, nulB20: -0.1, diferenta20: { medie: 0.9, interval: [0.2, 1.6] }, verdict: "în probă" };

await test("trendDinJson: primele 20 (fără spark), regimul, concentrarea ≥ 40 %, raportarea, ieșirile, bilanțul; numele sunt tăiate la 40", () => {
  const t = trendDinJson(jsonRobot(), bilantRobot, ACUM);
  assert.equal(t.dataUltimei, "2026-10-14"); assert.equal(t.top.length, 20); assert.equal(t.top[0].s, "T0"); assert.equal(t.top[0].spark, undefined);
  assert.equal(t.regim.peste, true); assert.deepEqual(t.concentrare, { sector: "Technology", n: 11 });
  assert.deepEqual(t.top[1].raporteaza, { d: "2026-10-22", ora: "amc" }); assert.equal(t.top[0].raporteaza, null);
  assert.deepEqual(t.iesiri, [{ s: "DOCN", motiv: "a căzut la top 23,0 %" }]); assert.deepEqual(t.intrari, ["ATI"]);
  assert.equal(t.bilant.n20, 17); assert.equal(t.bilant.verdict, "în probă"); assert.equal(t.raportari, "finnhub");
  assert.equal(t.sursa, SURSA + "trend-12-1.json");
  assert.equal(trendDinJson(jsonRobot({ sectoare: { Technology: 7, Energy: 6, Other: 7 } }), null, ACUM).concentrare, null, "sub 40 % nu e concentrare");
});
await test("trendDinJson: fișier stricat ⇒ null (versiune, dată, clasament gol); bilanț fără versiune ⇒ fără bilanț", () => {
  assert.equal(trendDinJson({ ...jsonRobot(), versiune: 2 }, null, ACUM), null);
  assert.equal(trendDinJson({ ...jsonRobot(), dataUltimei: "ieri" }, null, ACUM), null);
  assert.equal(trendDinJson({ ...jsonRobot(), clasament: [] }, null, ACUM), null);
  assert.equal(trendDinJson(jsonRobot(), { zile: 3 }, ACUM).bilant, null);
});
await test("verdicteTrend: un „top” pe fiecare nume, sursa trend-12-1, prețul din clasament", () => {
  const v = verdicteTrend(trendDinJson(jsonRobot(), null, ACUM), ACUM);
  assert.equal(v.length, 20); assert.deepEqual(v[0], { s: "trend-12-1", k: "T0", n: "top", p: 50, t: ACUM });
});
function dFals({ ok = true, acum = ACUM, forta = false } = {}) {
  const trimise = [], jurnal = [];
  return {
    d: { acum, forta, jurnal: (m) => jurnal.push(m), trimite: async (cale, corp) => { trimise.push({ cale, corp }); return { ok: true }; },
      fetch: async (url) => { if (!ok) return { ok: false, status: 503 }; return { ok: true, json: async () => (/bilant/.test(url) ? bilantRobot : jsonRobot()) }; } },
    trimise, jurnal,
  };
}
await test("turaTrend: o dată pe zi după 8:00 ⇒ KV + 20 de verdicte; a doua oară în aceeași zi nu mai cere nimic; aceeași zi de date ⇒ „nimic nou”", async () => {
  const f = dFals(), st = {};
  const r = await turaTrend(f.d, st);
  assert.deepEqual(r, { noua: true, n: 20 });
  assert.equal(f.trimise[0].cale, "/api/istoric-bot?action=trend12"); assert.equal(f.trimise[0].corp.top.length, 20);
  assert.equal(f.trimise[1].cale, "/api/istoric-bot?action=verdict"); assert.equal(f.trimise[1].corp.verdicte.length, 20);
  assert.match(f.jurnal[0], /trend: 2026-10-14 · regim pornit · 20 în jurnalul verdictelor · 11\/20 Technology · proba: în probă/);
  assert.equal(await turaTrend(f.d, st), null, "aceeași zi RO ⇒ nu mai rulează");
  const g = dFals(), st2 = { dataUltimei: "2026-10-14" };
  assert.deepEqual(await turaTrend(g.d, st2), { noua: false }); assert.equal(g.trimise.length, 0); assert.match(g.jurnal[0], /nimic nou/);
});
await test("turaTrend: înainte de 8:00 nu rulează (decât forțată); robotul picat ⇒ nimic trimis, reîncercare după 2 ore", async () => {
  const devreme = Date.parse("2026-10-15T03:30:00Z");   // 06:30 RO
  const f = dFals({ acum: devreme }); assert.equal(await turaTrend(f.d, {}), null); assert.equal(f.trimise.length, 0);
  const g = dFals({ acum: devreme, forta: true }); assert.equal((await turaTrend(g.d, {})).noua, true);
  const h = dFals({ ok: false }), st = {}; assert.equal(await turaTrend(h.d, st), null); assert.equal(h.trimise.length, 0); assert.equal(st.esecLa, ACUM); assert.match(h.jurnal[0], /HTTP 503/);
  assert.equal(await turaTrend(dFals().d, st), null, "sub 2 ore de la eșec nu reîncearcă");
});

// ── pagina Sugestii ──
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, location: { hash: "" } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
await test("sugTrendHtml: titlul „în probă”, regula, nota (EOD, regim, 11 din 20, proba), 20 de butoane spre Poartă, 12-1 și 60 z cu o zecimală, raportarea, numele escapat", () => {
  const t = trendDinJson(jsonRobot(), bilantRobot, ACUM);
  const h = ctx.sugTrendHtml(t, ACUM);
  assert.match(h, /Trend 12 luni \(în probă\)/); assert.match(h, /fixată înainte de cifre/); assert.match(h, /nu e un buton de cumpărat/);
  assert.match(h, /EOD 2026-10-14 · regim pornit · 11 din 20 Technology — un singur pariu · proba: 17 zile cu rezultat/); assert.match(h, /\+0,9 % vs alte acțiuni/);
  assert.equal((h.match(/sugLaPoarta\('T\d+'\)/g) || []).length, 20);
  assert.match(h, /12-1 \+150,0 %/); assert.match(h, /60 z \+30,0 %/); assert.match(h, /raportează în 7z/); assert.match(h, /au ieșit: DOCN/);
  assert.ok(!h.includes("<script>"), "numele cu <script> e escapat"); assert.match(h, /&lt;script&gt;/);
  assert.match(ctx.sugTrendHtml(null, ACUM), /Clasamentul vine o dată pe zi/);
});
await test("sugHtml include secțiunea Trend după topul pe sectoare; pagina o cere de la /api/istoric-bot?action=trend12", () => {
  const src = citeste("public", "lib", "sugestii-ecran.js");
  assert.match(src, /sugSectoareHtml\(d\.sectoare, acum\) \+ sugTrendHtml\(d\.trend12, acum\)/);
  assert.match(src, /pas\("trend12", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=trend12"\)/);
});

// ── verdicte, server, colector, versiuni ──
await test("jurnalul verdictelor cunoaște sursa trend-12-1 (pagina + serverul), la 5 și 20 de zile față de QQQ", () => {
  const v = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; v.window = v; vm.createContext(v);
  vm.runInContext(citeste("public", "lib", "verdicte.js"), v);
  const S = v.Verdicte.SURSE["trend-12-1"]; assert.ok(S, "sursa există în verdicte.js"); assert.equal(S.h.join(","), "5,20"); assert.equal(S.masura, "pesteQqq"); assert.equal(S.fav.join(","), "top");   // obiecte din vm (alt realm): se compară prin join
  assert.equal(v.Verdicte.curata({ s: "trend-12-1", k: "NVDA", n: "top", p: 180, t: ACUM }).k, "NVDA");
  const api = citeste("functions", "api", "istoric-bot.js");
  assert.match(api, /"top-sector","trend-12-1"\]\)/, "serverul acceptă sursa");
  assert.match(api, /action==="trend12"\)\{let v=null;try\{v=JSON\.parse\(await env\.ISTORIC\.get\("sugestii:trend12"\)/, "GET trend12");
  assert.match(api, /action==="trend12"\)\{if\(!\(nr\(corp&&corp\.la\)>0\)/, "PUT trend12 cu verificare");
  assert.match(api, /action==="sectoareTop"\|\|action==="trend12"\?262144/, "limita de mărime");
});
await test("colectorul rulează tura Trend o dată pe tură, cu fetch/trimite/jurnal; versiunile sunt la zi (v100.190 / v101.111)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \{ turaTrend as turaTrendModul \} from "\.\/lib\/tura-trend\.mjs"/);
  assert.match(c, /turaTrendColector\(\)\.catch\(\(e\) => jurnal\("trend", e\.message\)\)/);
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.111"/);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.190.0");
  assert.ok(!/v100\.189/.test(citeste("public", "index.html")), "index.html fără versiunea veche"); assert.match(citeste("public", "index.html"), /v100\.190/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-190/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
