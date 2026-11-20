// Proba v100.370 (20.11.2026, el: „fa idei” după v100.369 ⇒ cele 4 idei propuse la „Contul întreg”):
//  1 - crizele cu tot cu mișcarea leului din fereastra lor (acțiunea: (1 + r)(1 + leu) − 1; botul: leul mișcă valoarea lui, nu expunerea)
//  2 - proba riscului pe zilele REALE ale contului: unealta + regula scrisă dinainte (verdict de la 250 de zile de bursă), pragul „de acum”
//      ținut pe rândul zilei; weekendurile, zilele parțiale și mutările de bani nu se judecă
//  3 - „Măsura frânei”: fapta la vedere, lista orelor într-un pliu
//  4 - riscul pe 250 de zile de BURSĂ și când e un bot în cont (înainte: 250 de zile de calendar ≈ 179 de bursă)
//   node scripts/proba-v100370.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.370 · ideile Contului întreg · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, RegExp, TextRo: globalThis.TextRo, document: { getElementById: () => null } };
ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["cont-intreg.js", "cont-grafice.js", "factori.js", "disciplina.js", "cont-ecran.js"]) vm.runInContext(citeste("public", "lib", f) + (f === "cont-ecran.js" ? "\n;globalThis.ciHtml=ciHtml;globalThis.ciMasuraHtml=ciMasuraHtml;globalThis.ciProbaRealaHtml=ciProbaRealaHtml;globalThis.ciStresHtml=ciStresHtml;" : ""), ctx, { filename: f });
const C = ctx.ContIntreg, ZI = 86400000;
const aproape = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (m || "") + " " + a + " ≠ " + b);
const T = (z) => Date.parse(z + "T21:00:00Z");

// ---------------- 1. leul în crize ----------------
await test("1a criza cu mișcarea leului: acțiunea −10 %, dolarul +5 % față de leu ⇒ −5,5 % în lei; fără cursul ferestrei rămâne socoteala veche (−10 %)", () => {
  const e = [{ tip: "t212", cheie: "T:A", nume: "A", clasa: "actiuni", moneda: "USD", notionalLei: 10000, valoareLei: 10000 }];
  const bare = [{ t: T("2024-03-01"), c: 100 }, { t: T("2024-03-04"), c: 95 }, { t: T("2024-03-05"), c: 90 }], q = [{ t: T("2024-03-01"), c: 400 }, { t: T("2024-03-05"), c: 380 }];
  const fxb = [{ t: T("2024-03-01"), c: 4.0 }, { t: T("2024-03-05"), c: 4.2 }], crize = [{ cod: "x", nume: "X", de: "2024-03-01", pana: "2024-03-05" }];
  const cu = C.stres(e, { crize, factori: { QQQ: q, BTC: q, SPY: q }, bareLungi: { "T:A": bare }, betas: {}, leiPe: { USD: 4.2 }, fx: { USD: fxb } })[0];
  aproape(cu.pnl, 10000 * (0.9 * 1.05 - 1), 1e-6, "cu leul"); aproape(cu.leu, 0.05, 1e-9);
  const fara = C.stres(e, { crize, factori: { QQQ: q, BTC: q, SPY: q }, bareLungi: { "T:A": bare }, betas: {}, leiPe: { USD: 4.2 } })[0];
  aproape(fara.pnl, -1000, 1e-6, "fără fx: ca înainte"); assert.equal(fara.leu, undefined);
  const lipsa = C.stres(e, { crize, factori: { QQQ: q, BTC: q, SPY: q }, bareLungi: { "T:A": bare }, betas: {}, leiPe: { USD: 4.2 }, fx: { USD: [{ t: T("2019-01-02"), c: 4 }] } })[0];
  assert.equal(lipsa.leu, null, "fără bare de curs lângă fereastră ⇒ lipsă spusă"); aproape(lipsa.pnl, -1000, 1e-6);
});
await test("1b botul: leul mișcă VALOAREA lui (marja), nu expunerea cu levier; fereastra de o zi pe aceeași bară de curs ⇒ 0, nu lipsă", () => {
  const b = { tip: "bot", cheie: "C:X", nume: "X (bot long 3×)", clasa: "crypto", moneda: "USD", pret: 100, notional: 300, notionalLei: 1260, valoare: 100, valoareLei: 420, dir: "long", levier: 3, investit: 100, gridJos: null, gridSus: null, lichJos: null, lichSus: null };
  const bare = [{ t: T("2024-03-01"), c: 100 }, { t: T("2024-03-05"), c: 95 }], fxb = [{ t: T("2024-03-01"), c: 4.0 }, { t: T("2024-03-05"), c: 4.2 }], crize = [{ cod: "x", nume: "X", de: "2024-03-01", pana: "2024-03-05" }];
  const s = C.stres([b], { crize, factori: { BTC: bare, QQQ: bare, SPY: bare }, bareLungi: { "C:X": bare }, betas: {}, leiPe: { USD: 4.2 }, fx: { USD: fxb } })[0];
  aproape(s.pnl, 300 * -0.05 * 4.2 + 420 * 0.05, 1e-6, "pnl-ul în dolari la curs + valoarea mișcată de leu");
  const o1 = C.stres([b], { crize: [{ cod: "y", nume: "Y", de: "2024-03-04", pana: "2024-03-05" }], factori: { BTC: [{ t: T("2024-03-04"), c: 100 }, { t: T("2024-03-05"), c: 95 }], QQQ: null, SPY: null }, bareLungi: {}, betas: { "C:X": 1 }, leiPe: { USD: 4.2 }, fx: { USD: [{ t: T("2024-03-03"), c: 4.0 }, { t: T("2024-03-08"), c: 4.2 }] } })[0];
  assert.equal(o1.leu, 0, "aceeași bară de curs la ambele capete");
});
await test("1c colectorul dă cursul pe 10 ani crizelor; pagina spune „dolarul +2,6 % față de leu” sub criză și „cu tot cu mișcarea leului” în metodă", () => {
  const src = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(src, /const stres = C\.stres\(e, \{ factori, bareLungi, betas, leiPe, fx: fxCrize \}\);/); assert.match(src, /leu: rot\(s\.leu, 4\)/);
  const r = { valoare: { total: 23000 }, stres: [{ cod: "covidTot", nume: "Covid întreg", de: "2020-02-19", pana: "2020-03-23", btc: -0.334, qqq: -0.281, lei: -9302, leu: 0.0264, pozitii: [{ nume: "APLD", lei: -2713 }] }, { cod: "v", nume: "Veche", de: "2022-05-05", pana: "2022-05-12", btc: -0.2, qqq: -0.07, lei: -2000, pozitii: [] }, { cod: "n", nume: "Fără curs", de: "2021-05-11", pana: "2021-05-19", btc: -0.3, qqq: -0.01, lei: 100, leu: null, pozitii: [] }] };
  const h = ctx.ciStresHtml(r); assert.match(h, /19\.02–23\.03\.2020 · dolarul \+2,6 % față de leu/); assert.match(h, /11\.05–19\.05\.2021 · fără cursul leului din zilele acelea/); assert.doesNotMatch(h, /05\.05–12\.05\.2022 · /, "raportul vechi (fără câmpul leu) nu inventează nimic");
  assert.match(h, /puse pe pozițiile de acum, cu tot cu mișcarea leului/); assert.doesNotMatch(citeste("public", "lib", "cont-ecran.js"), /fără mișcarea leului/);
});

// ---------------- 2. proba pe zilele reale ----------------
const zile = (n, f) => { const o = []; let t = Date.parse("2026-01-05T00:00:00Z"), v = 30000; for (let i = 0; o.length < n; i++, t += ZI) { const z = new Date(t).toISOString().slice(0, 10), x = Object.assign({ z, valoare: v, complet: true, pionex: 500, t212: v - 500, salt: 0, raport: { valoare: { total: v }, risc: { var95: 1000 } } }, f ? f(o.length, z) : {}); o.push(x); v = x.valoare + (x.d || 0); } return o; };
await test("2a proba pe zilele reale: pragul salvat în ziua t față de schimbarea până a doua zi; weekendurile, zilele parțiale și golurile nu se judecă", () => {
  const Z = zile(15, (i) => ({ d: i === 2 ? -1500 : i === 8 ? -999 : 50 }));   /* 05.01 e luni; ziua 2 = miercuri: −1.500 sub pragul de 1.000 */
  Z.forEach((x, i) => { if (i) x.valoare = Z[i - 1].valoare + Z[i - 1].d; });
  const p = C.probaReala(Z); assert.equal(p.x, 1, "o depășire"); assert.equal(p.depasiri[0].z, "2026-01-07"); assert.equal(p.depasiri[0].lei, -1500); assert.equal(p.n, 10, "14 perechi, fără cele 4 de weekend");
  aproape(p.asteptat, 0.5); assert.equal(p.destule, false); assert.equal(p.test, null, "sub 250 de zile: fără verdict"); assert.equal(p.minim, 250);
  const P = JSON.parse(JSON.stringify(Z)); P[3].complet = false; const pp = C.probaReala(P); assert.equal(pp.n, 8, "ziua parțială scoate ambele perechi în care intră"); assert.equal(pp.sarite, 2);
  const F = JSON.parse(JSON.stringify(Z)); delete F[3].raport; assert.equal(C.probaReala(F).n, 9, "fără prag salvat ziua (joi) nu se judecă");
});
await test("2b o sursă care se golește sau apare din zero e o mutare de bani, nu o depășire (pe viu: Salt 8.899 → 0 pe 09.11 arăta −7.887 lei)", () => {
  const Z = zile(6, () => ({ d: 0 })); Z[1].salt = 8899; Z[1].valoare += 8899; Z[1].raport.valoare.total += 8899; Z[2].salt = 0;   /* marți → miercuri: Salt golit */
  Z[0].salt = 8899; Z[0].valoare += 8899;
  const p = C.probaReala(Z); assert.equal(p.x, 0, "mutarea nu e depășire"); assert.equal(p.mutari, 1); assert.equal(p.n, 4, "luni, miercuri, joi, vineri (marți = mutarea)"); assert.equal(p.sarite, 1);
});
await test("2c regula scrisă dinainte: verdict abia de la 250 de zile de bursă (Kupiec); pragul „de acum” (var95a) numărat separat; la 17 zile trebuie 4 depășiri", () => {
  aproape(C.binomPeste(17, 4, 0.05), 0.0088, 0.002, "P(≥ 4 din 17 | 5 %)"); assert.ok(C.binomPeste(17, 3, 0.05) > 0.05);
  const mare = zile(380, (i) => ({ d: i % 9 === 4 ? -1200 : 100, raport: { valoare: { total: 1 }, risc: i >= 200 ? { var95: 1000, var95a: 1300 } : { var95: 1000 } } }));
  mare.forEach((x, i) => { if (i) x.valoare = mare[i - 1].valoare + mare[i - 1].d; });
  const p = C.probaReala(mare); assert.ok(p.n >= 250, "n " + p.n); assert.equal(p.destule, true); assert.ok(p.test && p.test.p < 0.05, "≈ 11 % depășiri față de 5 % promis ⇒ respins"); assert.ok(p.na > 0 && p.na < p.n); assert.equal(p.xa, 0, "pragul de acum (1.300) n-a fost depășit de −1.200"); assert.equal(p.testAcum, null);
  const src = citeste("public", "lib", "cont-intreg.js"); assert.match(src, /Regula, scrisă ÎNAINTE de date: verdictul \(Kupiec\) abia de la 250 de zile de bursă judecate/);
});
await test("2d pagina: numărătoarea, „n-am aflat încă” cu regula și câte depășiri ar trebui; cu destule zile, verdictul; fără zile, spune că proba pornește singură", () => {
  const Z = zile(24, (i) => ({ d: i === 3 ? -1819 : 20 })); Z.forEach((x, i) => { if (i) x.valoare = Z[i - 1].valoare + Z[i - 1].d; });
  const h = ctx.ciProbaRealaHtml(Z); assert.match(h, /<h4>Proba pe zilele reale ale contului<\/h4>/);
  assert.match(h, /17 zile de bursă judecate, contul a scăzut peste pragul zilei proaste în 1 zi \(5,9 %; promis 5 %, adică ~0,9\): 08\.01\.2026 −1\.819 lei față de −1\.000 lei\. N-am aflat încă: verdictul vine la 250 de zile \(regula scrisă dinainte\); la 17 zile ar trebui cel puțin 4 depășiri ca să spun că pragul e prea mic\./);
  assert.match(h, /zilele parțiale, weekendurile și zilele în care o sursă s-a golit sau a apărut din zero \(mutare de bani\) nu se numără/); assert.match(h, /Pragul „de acum” se ține pe rândul zilei din v100\.370; până atunci proba e pe pragul vechi\./);
  assert.match(ctx.ciProbaRealaHtml([]), /proba pornește singură/); assert.match(ctx.ciProbaRealaHtml(null), /proba pornește singură/);
  const txt = h.replace(/<[^>]+>/g, " "); assert.equal(txt.match(/(^|[^\d.,])[−-]?\d+,\d\d(?!\d)/g), null, "o singură zecimală");
  const pag = ctx.ciHtml({ la: Date.now(), valoare: { total: 30000, complet: true, lipsa: [] }, risc: {}, riscAcum: null }, { zile: Z, acum: Date.now(), erori: {} }); assert.match(pag, /Proba pe zilele reale ale contului/); assert.doesNotMatch(pag, /zilele sunt încă prea puține ca să judece ceva/);
});
const TC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-cont.mjs")).href);
await test("2e pragul „de acum” ajunge pe rândul zilei: colectorul îl pune (doar când există), ruta îl ține; rândul vechi rămâne cu forma lui", async () => {
  const a = await TC.campuriZiFrana(null, Date.now(), { valoare: { total: 23000 }, risc: { var95: 1226 }, riscAcum: { acum: { var95: 1627.1 } } }); assert.deepEqual(JSON.parse(JSON.stringify(a.raport)), { valoare: { total: 23000 }, risc: { var95: 1226, var95a: 1627 } });
  const v = await TC.campuriZiFrana(null, Date.now(), { valoare: { total: 23000 }, risc: { var95: 1226 } }); assert.deepEqual(JSON.parse(JSON.stringify(v.raport)), { valoare: { total: 23000 }, risc: { var95: 1226 } });
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, x) => { kv.set(k, x); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`); let ip = 0;
  const hd = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.37.0." + (++ip) });
  const post = async (c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=contZi", { method: "POST", headers: hd(), body: JSON.stringify(c) }), env })).status;
  assert.equal(await post({ z: "2026-11-20", valoare: 23082, complet: true, pionex: 434, t212: 22648, salt: 0, citit: 1795166264508, raport: { valoare: { total: 23082 }, risc: { var95: 1226, var95a: 1627 } } }), 200);
  assert.equal(await post({ z: "2026-11-19", valoare: 23607, complet: true, raport: { valoare: { total: 23607 }, risc: { var95: 1352 } } }), 200);
  const z = JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=contZile", { headers: hd() }), env })).text()).zile;
  assert.deepEqual(z[1].raport.risc, { var95: 1226, var95a: 1627 }); assert.deepEqual(z[0].raport.risc, { var95: 1352 }); assert.equal(z[1].citit, 1795166264508);
});

// ---------------- 3. Măsura frânei ----------------
await test("3 „Măsura frânei”: fapta la vedere (câte zile, boții, concluzia), orele într-un pliu; textul fără listă rămâne întreg", () => {
  const text = "Frâna de azi, pusă pe zilele salvate (23.10.2026 – 19.11.2026): în 3 zile din 28 ar fi zis „nu porni”, de la: 23.10.2026 06:08, 27.10.2026 05:16, 28.10.2026 05:19 (ora României). Boții pe care i-ar fi oprit: niciun bot. Prea puține zile ca să tragem o concluzie (trebuie cel puțin 10 de fiecare parte). Asta nu arată că frâna face bani.";
  const h = ctx.ciMasuraHtml({ masura: { text, complete: 28 } });
  assert.match(h, /<h4>Măsura frânei pe cartea închisă<\/h4><p class="ciRasp">Frâna de azi, pusă pe zilele salvate \(23\.10\.2026 – 19\.11\.2026\): în 3 zile din 28 ar fi zis „nu porni”\. Boții pe care i-ar fi oprit: niciun bot\. Prea puține zile/);
  assert.match(h, /<details class="ciMetoda"><summary>De când a zis „nu porni”, zi cu zi \(3\)<\/summary><p class="tbSub">23\.10\.2026 06:08 · 27\.10\.2026 05:16 · 28\.10\.2026 05:19 \(ora României\)<\/p><\/details>/);
  const fara = ctx.ciMasuraHtml({ masura: { text: "Frâna de azi, pusă pe zilele salvate: n-ar fi zis „nu porni” în nicio zi. Asta nu arată că frâna face bani.", complete: 5 } }); assert.match(fara, /n-ar fi zis „nu porni” în nicio zi\. Asta nu arată/); assert.doesNotMatch(fara, /<details/);
  assert.equal(ctx.ciMasuraHtml({ masura: { text: "N-am aflat: zilele vechi nu au pauza.", complete: 0 } }), "");
});

// ---------------- 4. 250 de zile de bursă ----------------
await test("4 riscul pe n zile de BURSĂ și când e un bot în cont: seriile cu weekenduri dau tot 250 de zile lucrătoare (înainte ~179); cartea doar pe acțiuni rămâne la fel", () => {
  const sA = {}, sC = {}; for (let t = Date.parse("2025-06-02T00:00:00Z"), i = 0; i < 520; i++, t += ZI) { const z = new Date(t).toISOString().slice(0, 10), w = new Date(t).getUTCDay(); sC[z] = 0.001; if (w !== 0 && w !== 6) sA[z] = 0.002; }
  const a = { cheie: "T:A", nume: "A", clasa: "actiuni", moneda: "USD", tip: "t212", notionalLei: 10000, valoareLei: 10000 }, b = { cheie: "C:X", nume: "X", clasa: "crypto", moneda: "USD", tip: "bot", notionalLei: 500, valoareLei: 200 };
  const cu = C.pnlIstoric([a, b], { "T:A": sA, "C:X": sC }, {}, { n: 250 }); assert.equal(cu.zile.length, 250, "cu botul: " + cu.zile.length); assert.equal(cu.scoase.length, 0); assert.ok(cu.zileCal.length > 340, "zilele de calendar dintre ele rămân (weekendul se adună în luni)");
  const fara = C.pnlIstoric([a], { "T:A": sA }, {}, { n: 250 }); assert.equal(fara.zile.length, 250); assert.equal(fara.zileCal.length, 250);
  const explicit = C.pnlIstoric([a], { "T:A": sA }, {}, { zile: Object.keys(sA).sort().slice(-30) }); assert.equal(explicit.zile.length, 30, "zilele date explicit rămân cum sunt");
});

// ---------------- versiunile ----------------
await test("V versiunile v100.370 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO), colectorul v101.206, forma raportului 370", () => {
  const H = citeste("public", "index.html"); assert.equal((H.match(/v100\.370/g) || []).length, 4); assert.match(H, /v100\.370 · IDEILE CONTULUI ÎNTREG/); assert.doesNotMatch(H, /v100\.369/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-370/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.370"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.370.0"); assert.match(p.scripts.test, /npm run test:v100369 && npm run test:v100370/); assert.equal(p.scripts["test:v100370"], "node scripts/proba-v100370.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.badge, /^v100\.370/); assert.ok(bi.ci370 && bi.ci369);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.206";/); assert.equal(TC.FORMA_RAPORT, 370);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
