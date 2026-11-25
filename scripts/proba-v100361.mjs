// Proba v100.361 (18.11.2026, el: „ce mai facem?” ⇒ „continuă atunci”; Trade-ul zilei „ca Jurnalul”, hotărârile LUI: cifrele reparate și spuse
// cinstit, aspectul ca Jurnalul, toate 4 grafice; plus resturile Comportament). Calculul (banda din ziua făcută de la 15 UTC, gridul neschimbat,
// „se mai adaugă”), dovezile și graficele (TzDovezi), pagina (fraza, rândurile, cartela compactă, cele mai lichide, nimic pierdut), seara
// Comportament, Discordul, tema, versiunile.
//   node scripts/proba-v100361.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.361 · Trade-ul zilei cinstit\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, RegExp };
ctx.window = ctx; ctx.module = undefined; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["text-ro.js", "trade-zilei.js", "trade-zilei-dovezi.js", "trade-zilei-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
const TZ = ctx.TradeZilei, DV = ctx.TzDovezi;
const ORA = 3600000, ZI = 86400000, T0 = Math.floor(1761955200000 / ZI) * ZI;   // 2025-11-01 00:00 UTC
// zile cu range-urile date (ultima = azi, cu `oreAzi` bare închise); azi se mișcă `azi` (relativ) până acum
function bare(ranges, oreAzi, azi) {
  const out = []; const p = 100;
  ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) out.push({ t: T0 + d * ZI + h * ORA, o: p, h: h === 12 ? p * (1 + r / 2) : p * 1.001, l: h === 6 ? p * (1 - r / 2) : p * 0.999, c: p }); });
  const z = ranges.length; for (let h = 0; h < oreAzi; h++) out.push({ t: T0 + z * ZI + h * ORA, o: p, h: h === 0 ? p * (1 + azi / 2) : p, l: h === 0 ? p * (1 - azi / 2) : p, c: p });
  return out;
}
const R14 = Array(14).fill(0.04);
const aziLa = (ore, azi) => TZ.azi(bare(R14, ore, azi), T0 + 14 * ZI + ore * ORA + 300000);

await test("C1 banda „cât se mișcă azi”: până la 14 UTC = max(model, până acum); de la 15 UTC din ziua făcută (până acum × CUANT_G q25 / q50 / q75); gridul pe banda veche (neschimbat); „deja” rămâne pe banda veche", () => {
  assert.equal(TZ.ORA_G, 15);
  const d14 = aziLa(14, 0.02), d15 = aziLa(15, 0.02), dd = aziLa(16, 0.06);
  assert.equal(d14.bandaDinZi, false); assert.deepEqual(d14.asteptat, d14.asteptatGrid);
  assert.equal(d14.asteptat.med, Math.max(d14.asteptatModel.med, d14.panaAcum));
  assert.equal(d15.bandaDinZi, true); const q = TZ.CUANT_G[d15.oreZi - 1];
  assert.ok(Math.abs(d15.asteptat.p25 - d15.panaAcum * q[6]) < 1e-12 && Math.abs(d15.asteptat.med - d15.panaAcum * q[11]) < 1e-12 && Math.abs(d15.asteptat.p75 - d15.panaAcum * q[16]) < 1e-12);
  assert.equal(TZ.NIV_G[6], 0.25); assert.equal(TZ.NIV_G[11], 0.5); assert.equal(TZ.NIV_G[16], 0.75);
  // gridul: aceeași lățime ca înainte (BANDA_K × banda veche), stopul pe „cât se mișcă azi”
  const g = TZ.grid(d15); assert.ok(Math.abs(g.jumatate - TZ.BANDA_K[d15.oraUtc] * d15.asteptatGrid.med) < 1e-12); assert.equal(g.stop, Math.max(d15.asteptat.med, g.jumatate));
  assert.equal(dd.dejaMaiMult, true); assert.equal(dd.bandaDinZi, false); assert.deepEqual(dd.asteptat, dd.asteptatGrid);
  const d0 = aziLa(0, 0); assert.equal(d0.bandaDinZi, false); assert.equal(d0.aziHi, null);
});
await test("C2 „se mai adaugă” = mediana − până acum (nu mișcarea întreagă × ce rămâne din curbă: EVAA 21,9 + 9,3 > 27,6); maximul / minimul de azi întorși", () => {
  for (const [o, a] of [[3, 0.01], [12, 0.025], [18, 0.03]]) { const d = aziLa(o, a); assert.ok(Math.abs(d.adaos - Math.max(0, d.asteptat.med - d.panaAcum)) < 1e-12); assert.ok(d.panaAcum + d.adaos <= Math.max(d.asteptat.med, d.panaAcum) + 1e-12); assert.ok(d.aziHi >= d.aziLo); }
  assert.equal("ramaneAsteptat" in aziLa(5, 0.01), false, "câmpul vechi a plecat (nimeni nu-l mai citește)");
});
await test("D1 dovezile măsurate (TzDovezi): perioadele, 24 de ore iarna / vara, decilele cifrei mari, gridul pe 24 de ore, puterea probei A", () => {
  const D = DV.D; assert.equal(D.perioade.control.zile, 190); assert.equal(D.perioade.noi.zile, 17);
  assert.equal(D.ore.iarna.length, 24); assert.equal(D.ore.vara.length, 24); assert.ok(Math.abs(D.ore.iarna.reduce((s, x) => s + x, 0) - 1) < 0.02);
  assert.equal(D.p3.length, 2); assert.ok(D.p3[0].puncte.length >= 8); assert.equal(D.grid.control.length, 24); assert.equal(D.grid.noi.length, 24);
  assert.ok(D.probaA.putere > 0.05 && D.probaA.putere < 0.15, "puterea ~1 din 10: " + D.probaA.putere);
  // vârful zilei în ora României: 16:00–20:00 și iarna, și vara (deschiderea SUA 16:30 RO în ambele)
  const iarna = DV.oreRo(Date.UTC(2026, 10, 18, 12)), vara = DV.oreRo(Date.UTC(2026, 6, 15, 12));
  assert.equal(iarna.dec, 2); assert.equal(vara.dec, 3); assert.equal(iarna.varf, 16); assert.equal(vara.varf, 16);
});
await test("D2 graficele: SVG ca șir, lățimea cerută, 24 de bare cu vârful de 4 ore, punctele cu mustăți, nimic NaN, textul scăpat", () => {
  const o = DV.ore(Date.UTC(2026, 10, 18, 12), { lat: 700 });
  assert.match(o.svg, /^<svg class="jgSvg" viewBox="0 0 700 /); assert.equal((o.svg.match(/<rect /g) || []).length, 24); assert.equal((o.svg.match(/jgAtent/g) || []).length, 4);
  assert.match(o.svg, /14:00–15:00 ora României: \d+,\d % din agitația zilei/);
  const c = DV.calib({ lat: 520 }), n = DV.D.p3.reduce((s, x) => s + x.puncte.length, 0); assert.equal((c.match(/<circle /g) || []).length, n);
  const g = DV.grid(Date.UTC(2026, 10, 18, 12), { lat: 640 }); assert.equal((g.svg.match(/<circle /g) || []).length, 48); assert.ok(g.abat < 0 && g.abat > -0.06, "în medie a prins mai rar decât spunea: " + g.abat);
  for (const s of [o.svg, c, g.svg]) { assert.doesNotMatch(s, /NaN|undefined|Infinity/); assert.doesNotMatch(s, /\d\.\d+ %/); }
  const A = DV.probaA({ zile: 14, nSemnal: 55, netSemnal: -0.008, netRest: 0.0076 }); assert.equal(A.total, 89); assert.ok(Math.abs(A.procent - 14 / 89) < 1e-12);
});
const fix = (simbol, fel, d) => ({ simbol, pionex: simbol + "_USDT_PERP", fel, d });
function pagina(extra) {
  const dB = aziLa(10, 0.015), monede = [fix("PENDLE", "bot", dB), fix("BTC", "piata", aziLa(10, 0.01)), fix("ETH", "piata", aziLa(16, 0.02)), fix("SOL", "piata", aziLa(10, 0.03)), fix("<b>X</b>", "top", aziLa(10, 0.02)), { simbol: "ZZZ", pionex: "ZZZ_USDT_PERP", fel: "top", eroare: "nu am putut citi lumânările (x)" }];
  return ctx.tzHtml(Object.assign({ monede, simboluri: monede, la: Date.now(), zi: 0, inLucru: false, eroare: null, probaA: { zile: 14, nSemnal: 55, netSemnal: -0.008, netRest: 0.0076 }, deschise: {}, surse: false }, extra || {}), Date.now());
}
await test("P1 pagina: capul cu tema, fraza (o dată „niciun trade dovedit” + de ce), De unde știu cu ora 16–20, secțiunile pliabile, cartelele compacte, cele mai lichide, graficele, proba A cu puterea", () => {
  const h = pagina();
  assert.match(h, /<h2 class="tzH1">🎯 Trade-ul zilei<\/h2>/); assert.match(h, /id="tzTemaBtn"[^>]*data-action-click="tbTemaComuta\(\)"/); assert.match(h, /data-action-click="tzPorneste\(true\)">↻ Recitește/);
  assert.match(h, /<p class="grFraza">Azi nu e niciun trade cu avantaj dovedit pe datele tale\.<\/p>/); assert.equal((h.match(/au pierdut după cost pe 2 ani/g) || []).length, 1, "motivul o singură dată, nu pe fiecare cartelă");
  assert.match(h, /Botul tău: PENDLE /); assert.match(h, /mișcarea așteptată, la mijloc \(mediana\), \d+,\d %/);
  assert.match(h, /<summary>De unde știu<\/summary>/); assert.match(h, /Orele cele mai agitate: \d\d–\d\d ora României \(deschiderea bursei din SUA, la 16:30\)/); assert.doesNotMatch(h, /15–18/);
  assert.match(h, /calibrat în medie; la valori mari spune prea puțin/);
  for (const id of Object.keys(ctx.TZ_RANDURI)) assert.match(h, new RegExp('id="' + id + '"'), id);
  assert.deepEqual(Object.keys(ctx.TZ_RANDURI), ["tzSBoti", "tzSPiata", "tzSTop", "tzSOre", "tzSP3", "tzSGrid", "tzSProba"]); assert.deepEqual(Object.keys(ctx.TZ_RAND_DESCHIS), ["tzSBoti", "tzSPiata"]);
  assert.equal((h.match(/<article class="tzCard/g) || []).length, 4, "PENDLE + BTC / ETH / SOL pe cartele"); assert.match(h, /class="tzCard tzCardBot"/);
  assert.equal((h.match(/<details class="tzTop"/g) || []).length, 2); assert.ok(h.includes("&lt;b&gt;X&lt;/b&gt;") && !h.includes("<b>X</b>"), "simbolul scăpat");
  assert.equal((h.match(/>Grid: ce setez\? →<\/button>/g) || []).length, 5, "butonul pe fiecare monedă cu cifre (nimic pierdut)"); assert.match(h, /nu am putut citi lumânările/);
  assert.equal((h.match(/<summary>Toate cifrele<\/summary>/g) || []).length, 5); assert.match(h, /class="tzBara"/); assert.match(h, /class="tzPret"/);
  assert.equal((h.match(/<svg /g) || []).length, 3); assert.match(h, /Cele mai agitate patru ore: <b>16:00–20:00<\/b> ora României|Cele mai agitate patru ore: <b>\d\d:00–\d\d:00<\/b>/);
  assert.match(h, /14 zile judecate din ~89/); assert.match(h, /proba îl prinde doar în ~1 caz din 10/); assert.match(h, /NU înseamnă „s-a dovedit că nu”/);
  assert.match(h, /cuprinde restul zilei UTC cam în șapte zile din zece/); assert.doesNotMatch(h, /\d\.\d+ %/); assert.doesNotMatch(h, /mai rămân ~/);
  assert.match(h, /se mai adaugă ~\d+,\d %/); assert.match(h, /· din ziua făcută \(de la 15:00 UTC\)/, "ETH la 16 UTC");
});
await test("P2 prețul: 1–10 USDT cu 3 zecimale (PENDLE 1,414), sub 1 cu 4, peste 10 cu 2; P1 fără verde (nedovedit); stările păstrate peste redesenări", () => {
  assert.equal(ctx.tzPret(1.414), "1,414"); assert.equal(ctx.tzPret(0.9984), "0,9984"); assert.equal(ctx.tzPret(1.0016), "1,002"); assert.equal(ctx.tzPret(64204.9), "64.204,90"); assert.equal(ctx.tzPret(0.00271), "0,00271");
  const d = aziLa(10, 0.015); d.p1Sus = { p: 0.9, atins: false, dist: 0.01 }; const h = ctx.tzCartela(fix("BTC", "piata", d));
  assert.match(h, /max ieri<\/span> [\d.,]+ · atinge azi <b>90 %<\/b>/); assert.doesNotMatch(h.slice(h.indexOf('class="tzPCapete')), /tzBun/, "P1 nedovedit ⇒ fără verde");
  ctx.tzStare.deschise = { "tzd-BTC": true }; assert.match(ctx.tzCartela(fix("BTC", "piata", d)), /<details class="tzDet" data-det="tzd-BTC" open>/); ctx.tzStare.deschise = {};
  assert.match(pagina({ surse: true }), /<details class="grSurse" open>/);
});
await test("P3 stările: încarcă / eroare / gol; „Mai citesc…” cât vin cartelele; moneda fără „fel” stă la piață (nu se pierde)", () => {
  assert.match(ctx.tzHtml({ monede: [], simboluri: [], la: 0, inLucru: true, eroare: null, deschise: {} }), /Aduc lumânările…/);
  assert.match(ctx.tzHtml({ monede: [], simboluri: [], la: 0, inLucru: false, eroare: "pică", deschise: {} }), /pică[\s\S]*Încearcă din nou/);
  assert.match(ctx.tzHtml({ monede: [], simboluri: [], la: 0, inLucru: false, eroare: null, deschise: {} }), /apasă „Recitește”/);
  const h = ctx.tzHtml({ monede: [{ simbol: "QQQ", d: aziLa(10, 0.01) }], simboluri: [1, 2], la: 0, inLucru: true, eroare: null, deschise: {} });
  assert.match(h, /Mai citesc… 1 \/ 2/); assert.match(h, /aria-label="QQQ"/);
});
await test("K1 Comportament: seara nu mai numără închiderea în minute ca regulă încălcată; sfatul despre minute după datele lui (persoana I, o frază, ≤ 110)", async () => {
  const CO = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "comportament.mjs")).href), MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
  const A = Date.UTC(2026, 10, 18, 20), s = CO.searaZilei([{ id: "a", inchis: A - 3600000, net: -1, rele: ["minute"] }, { id: "b", inchis: A - 1800000, net: -2, rele: ["frana", "minute"] }], A);
  assert.equal(s.bune.n, 1); assert.equal(s.rele.n, 1); assert.equal(s.pe.minute, undefined); assert.equal(s.top, "frana");
  const t = MC.sfatSeara("minute", 7); assert.match(t, /^Aș lăsa închiderile în minute: pe istoria ta n-au dat mai prost decât ceilalți boți\.$/); assert.ok(t.length <= 110);
});
await test("K2 Discord: prețul 1–10 USDT cu 3 zecimale, mediana mișcării, sursa benzii spusă după 15 UTC; rândurile ≤ 160", async () => {
  const { liniiTradeZilei } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-trade-zilei.mjs")).href);
  const d = aziLa(16, 0.02); d.pret = 1.414; const l = liniiTradeZilei([{ simbol: "PENDLE", fel: "bot", d }, { simbol: "BTC", fel: "piata", d: aziLa(16, 0.01) }], TZ);
  assert.match(l[0], /mișcarea așteptată \(mediana\) \d+,\d %/); assert.match(l[1], /^🤖 PENDLE 1,414 · /);
  assert.equal(l[l.length - 1], "„>ieri” și „azi ~” = din ziua de până acum (de la 15:00 UTC); gridul = din prognoza de la 00:00 UTC și ce s-a mișcat deja.");
  assert.ok(l.every((x) => x.length <= 160));
  const dim = liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: aziLa(7, 0.01) }], TZ); assert.match(dim[dim.length - 1], /„azi ~”, gridul și stopul = din prognoza de la 00:00 UTC/);
});
await test("T tema și legăturile: RADACINI, tbTemaAplica + tzTemaBtn, tema devreme, tbRandComuta ⇒ tzRandComuta, generatorul la zi, scripturile în ordine, cache-ul, CSS-ul (și ziua butonului)", () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"comportament", "tradezilei", "carnet", "scan", "salt", "alerts", "contintreg"\]/); const A = cuTablou(citeste("public", "app.js"));
  assert.match(A, /"comportament","tradezilei","carnet","scan","salt","alerts","contintreg"\]\.forEach\(function\(id\)\{var p=document\.getElementById\(id\);if\(p\)p\.classList\.toggle\("tbZi",zi\)\}\)/); assert.match(A, /"coTemaBtn","tzTemaBtn","cnTemaBtn","scTemaBtn","slTemaBtn","alTemaBtn","ciTemaBtn"\]/);
  assert.match(A, /return tzRandComuta\(id,deschis\)/); assert.match(citeste("public", "lib", "tema-devreme.js"), /"comportament", "tradezilei", "carnet", "scan", "salt", "alerts", "contintreg"\]/);
  execFileSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { stdio: "pipe" });
  const H = citeste("public", "index.html"); assert.match(H, /<script src="\/lib\/trade-zilei\.js"><\/script><script src="\/lib\/trade-zilei-dovezi\.js"><\/script>/); assert.ok(H.indexOf("/lib/trade-zilei-dovezi.js") < H.indexOf("/lib/trade-zilei-ecran.js"));
  assert.match(citeste("public", "sw.js"), /"\/lib\/trade-zilei\.js","\/lib\/trade-zilei-dovezi\.js"/);
  const C = citeste("public", "app.css"); for (const k of ["#tradezilei .tzBara{", "#tradezilei .tzPret{", "#tradezilei .tzTop{", "#tradezilei .tzGrGrila{", "#tradezilei.tbZi .acBtn{color:#0E1A2B}", 'html.pzDemo #tradezilei [data-rand="pliat"]']) assert.ok(C.includes(k), k);
  assert.ok(C.indexOf("#tradezilei .tzBara{") < C.indexOf("/* v100.313 (08.11.2026"), "înaintea blocului v100.313");
});
await test("V versiunile de la v100.361 încolo (v100.362: versiunea curentă o verifică proba ei); colectorul ≥ v101.198", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 361 && nr(citeste("public", "sw.js")) >= 361 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 361);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 361); assert.match(p.scripts.test, /npm run test:v100360 && npm run test:v100361/); assert.equal(p.scripts["test:v100361"], "node scripts/proba-v100361.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(bi.tz361 && bi.comport360);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 198);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
