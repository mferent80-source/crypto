// Proba v100.125 / colector v101.83 (07.10, el: „pagina salt vreau să o aduci la nivelul app” → „Ca Trading 212” → OK pe demo
// https://claude.ai/artifact/Y14BhgMwzEBJzmNGauuHJJ): pagina Salt pe scheletul paginii Trading 212 - cifrele de sus în EUR (cum
// plătește la Salt), „Ce ai de făcut acum”, ideile de cumpărare cu ACEEAȘI poartă ca la T212 (Idei.judecaActiune, în tura Salt a
// colectorului), pozițiile în tabelul T212 (IEȘI / ATENȚIE / ȚINE), „Vreau să cumpăr…”, portofoliul, toate instrumentele pliate.
// Pozițiile din probă sunt ale LUI (scrise în chat): RHM 1,0456 buc la 1.349,6 EUR pe 11.05; Netflix 14,43412 la 79,84 EUR pe 21.04.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "tablou-extra.js", "profil-moneda.js", "probabilitati.js", "semnale-bot.js", "consiliu.js", "actiuni-semnale.js", "consilier.js", "t212.js", "salt.js"])
  vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "salt-ecran.js"), { filename: "salt-ecran.js" });
// textul unei funcții din salt-ecran.js (pentru gărzile pe forma codului async, care cere DOM / rețea)
const SE = citeste("public", "lib", "salt-ecran.js");
globalThis.saltFunctie = (n) => { const i = SE.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = SE.indexOf("{", i); for (; j < SE.length; j++) { if (SE[j] === "{") a++; else if (SE[j] === "}" && --a === 0) break; } return SE.slice(i, j + 1); };
const TSalt = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-salt.mjs")).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.125 · Pagina Salt ca Trading 212 · proba\n");

const U = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG Inhaber-Aktien o.N.", tip: "actiune", bursa: "GER", moneda: "EUR" },
  { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc. Registered Shares DL -,001", tip: "actiune", bursa: "NMS", moneda: "USD" },
  { isin: "US24703L2025", simbol: "DELL", nume: "Dell Technologies Inc.", tip: "actiune", bursa: "NYQ", moneda: "USD" }];
const POZ = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: U[0].nume, qty: 1.0456, pretMediu: 1349.6, de: "2026-05-11", plata: "EUR" },
  { isin: "US64110L1061", simbol: "NFLX", nume: U[1].nume, qty: 14.43412, pretMediu: 79.84, de: "2026-04-21", plata: "EUR" }];
const iesi = (stop) => ({ nivel: "iesi", eticheta: "🔴 Ieși", titlu: "Stopul care urcă e atins", faCe: "Aș ieși, tot sau jumătate, cum cere stopul care urcă.", bani: "dacă vinzi acum: −366,58 $ · prețul e deja sub stopul care urcă ($" + stop + ")",
  motive: [{ titlu: "Prețul e sub stopul care urcă ($" + stop + ")", text: "−15% de la maxim" }] });
const AN = {
  DE0007030009: { p: { pret: 980.2, pretMediu: 1349.6 }, st: { trend: { dir: "jos", tarie: "tare" } }, niv: { stopPozitie: 1109.08, tintaPozitie: 1434.03 }, sem: { nivel: "iesi", motive: ["trend în jos"] }, cons: iesi("1109.08"), fxAcum: 1, beta: 1.13, indice: "DAX" },
  US64110L1061: { p: { pret: 68.69, pretMediu: 94.09 }, st: { trend: { dir: "jos", tarie: "tare" } }, niv: { stopPozitie: 80.49, tintaPozitie: 99.49 }, sem: { nivel: "iesi", motive: ["trend în jos"] }, cons: iesi("80.49"), fxAcum: 1.12, beta: -0.16, indice: "Nasdaq" } };
const IDEI = [{ isin: "US24703L2025", simbol: "DELL", nume: "Dell Technologies Inc.", moneda: "USD", tip: "actiune", pret: 574, intrare: 561.06, stop: 483.43, riscPct: 0.1384, tinta: 716.32, scor: 0.13, pePlusProba: 0.746, nProba: 181, prob: { tinta5: 0.02, stop1: 0.005 }, prof: { dist: 0.0685, strans: false }, motive: ["trend în sus pe zilnice (tare)", "fără mișcare mare", "pe istoricul ei, intrările în starea asta: 75% pe plus, +13,0% în medie (181 de zile)"] },
  { isin: "X2", simbol: "SNDK", nume: "SanDisk <b>", moneda: "USD", tip: "actiune", pret: 1660.46, intrare: 1660.46, stop: 1411.39, riscPct: 0.15, tinta: 2158.6, scor: 0.229, pePlusProba: 0.77, nProba: 222, motive: ["a", "b", "c"] }];
const RAP = { la: Date.UTC(2026, 9, 7, 5, 10), judecate: 509, fara: 1, tabel: [], liste: { urcare: [], revers: [{ isin: "X", simbol: "XYZ", nume: "Xyz", pret: 10, cadere: 0.2 }], revine: [] }, dovada: { urcare: { text: "u" }, revers: { text: "r" }, revine: { text: "v" } } };
const T0 = Date.UTC(2026, 9, 7, 9, 0);
const d0 = (o) => Object.assign({ univers: U, raport: Object.assign({}, RAP, { idei: IDEI }), pozitii: POZ, analize: AN, incarcate: true, filtru: "", eurRon: 5.3471, fila: null, deschis: {}, bilet: {}, verif: null }, o || {});
// cifrele așteptate, socotite aici (nu luate din pagină): valoarea în EUR la cursul de azi, costul = ce a plătit în EUR
const valR = 1.0456 * 980.2, valN = 14.43412 * 68.69 / 1.12, tot = valR + valN, cost = 1.0456 * 1349.6 + 14.43412 * 79.84, rez = tot - cost;
const ro1 = (v) => (v < 0 ? "−" : v > 0 ? "+" : "") + Math.abs(v).toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

await test("(1) cifrele de sus în EUR: ce ai la Salt (≈ lei), pe deschise (EUR, %), dacă piața scade 10% (beta ≤ 0 ⇒ 1, ca la T212), cea mai mare poziție", () => {
  const h = globalThis.saltHtml(d0(), T0);
  assert.match(h, /class="t212Kpi"/);
  assert.ok(h.includes(Math.abs(tot).toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " EUR"), "total " + tot);
  assert.ok(h.includes(ro1(rez) + " EUR"), "pe deschise " + rez);
  assert.ok(h.includes(Math.round(tot * 5.3471).toLocaleString("ro-RO") + " lei"), "≈ lei");
  const soc = -0.1 * 1.13 * valR - 0.1 * 1 * valN; assert.ok(h.includes(ro1(soc) + " EUR"), "piața −10%: " + soc);
  assert.match(h, /RHM · 54%|RHM · 53%/);
});
await test("(2) „Ce ai de făcut acum”: pozițiile pe IEȘI întâi, cu banii în EUR și „Vezi”, apoi plafonul de 20%", () => {
  const h = globalThis.saltHtml(d0(), T0), t = h.slice(h.indexOf('class="t212Todo"'), h.indexOf("</section>", h.indexOf('class="t212Todo"')));
  assert.match(t, /RHM: Stopul care urcă e atins/); assert.match(t, /data-action-click="saltVezi\('DE0007030009'\)"/); assert.match(t, /t212Dunga r/);
  assert.ok(t.includes("dacă vinzi acum: " + ro1(1.0456 * (980.2 - 1349.6)) + " EUR"), "banii la vânzare în EUR");
  assert.ok(t.indexOf("RHM: Stopul") < t.indexOf("din ce ai la Salt"), "IEȘI înaintea plafonului");
});
await test("(3) pozițiile în tabelul T212: pastila, rezultatul în EUR cu o zecimală, stopul care urcă atins, ținta, trendul, din Salt; detaliile la clic", () => {
  let h = globalThis.saltHtml(d0(), T0);
  assert.match(h, /<table class="t212Tab">/); assert.match(h, /class="t212Rand"[^>]*data-action-click="saltComuta\('DE0007030009'\)"/);
  for (const c of ["c-acum", "c-rez", "c-stop", "c-tinta", "c-trend", "c-pond"]) assert.match(h, new RegExp('class="' + c));
  assert.match(h, /t212Pill t212Pill-iesi/); assert.ok(h.includes(ro1(valN - 14.43412 * 79.84) + " EUR"), "rezultatul NFLX în EUR");
  assert.match(h, /68,69 USD/); assert.match(h, /≈ 61,33 EUR/); assert.match(h, /DEPĂȘIT|atins/);
  assert.match(h, /id="saltDet-DE0007030009" hidden/);
  h = globalThis.saltHtml(d0({ deschis: { DE0007030009: true } }), T0);
  assert.doesNotMatch(h, /id="saltDet-DE0007030009" hidden/); assert.match(h, /aria-expanded="true"/);
  assert.match(h, /Ce aș face eu/); assert.match(h, /1\.109,08 EUR/, "„$” din Consilier ⇒ moneda simbolului"); assert.doesNotMatch(h, /\$\d/);
  assert.match(h, /data-action-click="saltEditeaza\('DE0007030009'\)"/); assert.match(h, /data-action-click="saltSterge\('DE0007030009'\)"/);
  assert.doesNotMatch(h, /[+−]\d[\d.]*,\d\d EUR \(/, "rezultatele cu o zecimală");
});
await test("(4) ideile: aceeași poartă ca la T212 (din tura colectorului), filele cu listele Salt; fără idei ⇒ prima listă care are ceva + de ce", () => {
  let h = globalThis.saltHtml(d0(), T0);
  assert.match(h, /Idei · 2/); assert.match(h, /Revers timpuriu · 1/); assert.match(h, /data-action-click="saltFila\('revers'\)"/);
  assert.match(h, /<b>DELL<\/b>/); assert.match(h, /483,43 USD/); assert.match(h, /data-action-click="saltBilet\('DELL'\)"/); assert.match(h, /&lt;b&gt;/); assert.doesNotMatch(h, /SanDisk <b>/);
  assert.match(h, /din 509 instrumente Salt/);   // 509 ⇒ fără „de” (ultimele două cifre sub 20)
  h = globalThis.saltHtml(d0({ raport: Object.assign({}, RAP, { idei: undefined }) }), T0);
  assert.match(h, /XYZ/, "fără idei se deschide lista care are ceva"); assert.match(h, /ideile apar după tura colectorului/);
  h = globalThis.saltHtml(d0({ fila: "urcare" }), T0); assert.match(h, /aria-pressed="true"[^>]*>Început de urcare/); assert.match(h, /aria-pressed="false"[^>]*>Idei · 2/);
});
await test("(5) Biletul: la riscul de 1% din ce ai la Salt, bucățile în moneda bursei (curs EUR→moneda)", () => {
  const b = globalThis.saltBiletHtml(IDEI[0], 19, 1.12);
  const buc = 19 * 1.12 / (561.06 - 483.43);
  assert.ok(b.includes(buc.toLocaleString("ro-RO", { maximumFractionDigits: 3 }) + " buc"), b);
  assert.match(b, /561,06 USD/); assert.match(b, /483,43 USD/); assert.match(b, /716,32 USD/); assert.match(b, /19 EUR/);
});
await test("(6) „Vreau să cumpăr…”: trece ⇒ intrare / stop / țintă; nu trece ⇒ de ce; deja în portofoliu pe IEȘI ⇒ spus", () => {
  assert.match(globalThis.saltVreauHtml({ x: U[2], r: Object.assign({ trece: true }, IDEI[0]) }), /TRECE[\s\S]*561,06 USD/);
  assert.match(globalThis.saltVreauHtml({ x: U[2], r: { trece: false, motive: ["trend în jos pe zilnice"] } }), /NU[\s\S]*trend în jos pe zilnice/);
  assert.match(globalThis.saltVreauHtml({ x: U[0], r: { trece: false, motive: ["x"] }, ai: true }), /o ai deja/);
  assert.match(globalThis.saltVreauHtml({ eroare: "nu găsesc „ZZZ” în lista Salt" }), /ZZZ/);
});
await test("(7) tura Salt: Idei.judecaActiune pe fiecare instrument (cu Probabilitati / ProfilMoneda), cele care trec, după scor, cel mult 50; fără Idei ⇒ []", async () => {
  const ZI = 86400000, B0 = Date.UTC(2025, 0, 6);
  const bare = () => Array.from({ length: 300 }, (_, i) => { const c = 100 + i * 0.1 + Math.sin(i / 5); return { t: B0 + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c, v: 1000 }; });
  const univ = [{ isin: "A1", simbol: "AAA", nume: "Alfa", tip: "actiune", bursa: "NMS", moneda: "USD" }, { isin: "B1", simbol: "BBB", nume: "Beta", tip: "actiune", bursa: "NMS", moneda: "USD" }, { isin: "C1", simbol: "CCC", nume: "Gama", tip: "ETF", bursa: "GER", moneda: "EUR" }];
  const vazut = [];
  const Idei = { judecaActiune: (b, pret, o) => { vazut.push(o); return o.simbol === "AAA" ? { trece: true, scor: 0.05, pret, intrare: pret, stop: pret * 0.9, tinta: pret * 1.2, riscPct: 0.1, motive: ["m"] } : o.simbol === "CCC" ? { trece: true, scor: 0.09, pret, intrare: pret, stop: 1, tinta: 2, riscPct: 0.1, motive: [] } : { trece: false, motive: ["nu"] }; } };
  const r = await TSalt.turaSalt({ Salt: globalThis.Salt, SA: globalThis.SugestiiActiuni || { puncte: () => [], azi: () => null, dovada: () => ({}), textDovada: () => "", areSalt: () => true }, Idei, Probabilitati: { p: 1 }, ProfilMoneda: { m: 1 },
    univers: univ, cereBare: async () => bare(), acum: B0 + 300 * ZI, jurnal: () => {}, pauza: async () => {} });
  assert.deepEqual(r.idei.map((x) => x.simbol), ["CCC", "AAA"]); assert.equal(r.idei[0].moneda, "EUR"); assert.equal(r.idei[1].isin, "A1");
  assert.ok(vazut.every((o) => o.Probabilitati && o.ProfilMoneda && o.acum), "aceleași module ca ideile T212");
  const r2 = await TSalt.turaSalt({ Salt: globalThis.Salt, SA: { puncte: () => [], azi: () => null, dovada: () => ({}), textDovada: () => "", areSalt: () => true }, univers: univ.slice(0, 1), cereBare: async () => bare(), acum: B0 + 300 * ZI });
  assert.deepEqual(r2.idei, []);
});
await test("(8) colectorul dă turei Salt Idei, Probabilitati și ProfilMoneda; pagina: Idei încărcat, „Vreau să cumpăr” verifică pe orice instrument Salt", () => {
  const c = citeste("scripts", "colector.mjs"), s = citeste("public", "lib", "salt-ecran.js");
  assert.match(c, /turaSaltModul\(\{ Salt, SA: SugestiiActiuni, Reveniri, Idei, Probabilitati, ProfilMoneda,/);
  assert.match(s, /Idei\.judecaActiune\(/); assert.match(s, /Salt\.cauta\(/); assert.match(s, /ActiuniSemnale\.beta\(/);
  assert.match(s, /"EURRON=X"/); assert.match(s, /EXS1\.DE/); assert.match(s, /"QQQ"/);
});
// ---------------- revizia Opus (07.10) ----------------
await test("(R1, critic) GBp = pence: cursul EUR→GBP se înmulțește cu 100 și la Bilet (altfel bucăți de 100 de ori prea puține)", () => {
  assert.equal(globalThis.saltFxPret("GBp", 0.86), 86); assert.equal(globalThis.saltFxPret("USD", 1.12), 1.12); assert.equal(globalThis.saltFxPret("EUR", 5), 1); assert.equal(globalThis.saltFxPret("USD", null), null);
  const x = { simbol: "ULVR.L", moneda: "GBp", intrare: 2500, stop: 2300, tinta: 2900 }, b = globalThis.saltBiletHtml(x, 19, globalThis.saltFxPret("GBp", 0.86));
  assert.ok(b.includes((19 * 86 / 200).toLocaleString("ro-RO", { maximumFractionDigits: 3 }) + " buc"), b);
  assert.match(globalThis.saltFunctie("saltBilet"), /saltFxPret\(x\.moneda, /, "biletul trece prin saltFxPret");
});
await test("(R2) detaliile: nicio sumă în „$” - suma la stopul care urcă socotită în EUR, cu o zecimală", () => {
  const an = JSON.parse(JSON.stringify(AN));
  an.DE0007030009 = Object.assign(an.DE0007030009, { p: { pret: 1200, pretMediu: 1349.6 }, cons: Object.assign(iesi("1109.08"), { nivel: "atentie", bani: "dacă vinzi acum: −156,42 $ · dacă atinge stopul care urcă ($1109.08): −250,12 $" }) });
  const h = globalThis.saltHtml(d0({ analize: an, deschis: { DE0007030009: true } }), T0);
  assert.doesNotMatch(h, /\$/, "fără „$”"); assert.ok(h.includes("dacă atinge stopul care urcă (1.109,08 EUR): " + ro1(1.0456 * 1109.08 - 1.0456 * 1349.6) + " EUR"), "suma la stop în EUR");
});
await test("(R3) moneda din raport se escapează (intră în innerHTML)", () => {
  const h = globalThis.saltHtml(d0({ raport: Object.assign({}, RAP, { idei: [Object.assign({}, IDEI[0], { moneda: "<x>" })] }) }), T0);
  assert.doesNotMatch(h, /<x>/); assert.match(h, /&lt;x&gt;/);
});
await test("(R5/R10) „o ai deja” spune pe IEȘI să nu cumperi în plus, altfel doar cât crește; beta negativ cu „−”", () => {
  assert.match(globalThis.saltVreauHtml({ x: U[0], r: { trece: true, intrare: 1, stop: 1, tinta: 1, motive: [] }, ai: true, nivel: "tine" }), /o ai deja[^<]*crește/);
  assert.doesNotMatch(globalThis.saltVreauHtml({ x: U[0], r: { trece: true, intrare: 1, stop: 1, tinta: 1, motive: [] }, ai: true, nivel: "tine" }), /n-aș cumpăra în plus/);
  assert.match(globalThis.saltVreauHtml({ x: U[0], r: { trece: false, motive: [] }, ai: true, nivel: "iesi" }), /o ai deja[^<]*n-aș cumpăra în plus/);
  assert.match(globalThis.saltHtml(d0(), T0), /NFLX β −0,16/);
});
await test("(R4/R6/R8/R11) încărcarea nu redesenează tot la final; „Verifică” vechi nu calcă peste cel nou; indicele picat nu rămâne ținut minte; Biletul așteaptă toate prețurile", () => {
  const p = globalThis.saltFunctie("saltPorneste"); assert.match(p, /finally \{ saltStare\.inLucru = false; \}\s*if \(saltStare\.d\.eroare\) saltDeseneaza\(\); else saltDeseneazaPoz\(\);/);
  assert.match(globalThis.saltFunctie("saltVerifica"), /if \(d\.verif && d\.verif\.x === x\)/);
  assert.doesNotMatch(globalThis.saltFunctie("saltBareIndice"), /indici\[i\.sim\] = \[\]/);
  assert.match(globalThis.saltFunctie("saltBilet"), /aștept prețurile pozițiilor/);
});
await test("(R7) tura Salt: erorile din judecaActiune se numără și ajung în jurnal (nu „niciuna nu trece” tăcut)", async () => {
  const ZI = 86400000, B0 = Date.UTC(2025, 0, 6), j = [];
  const bare = () => Array.from({ length: 300 }, (_, i) => { const c = 100 + i * 0.1; return { t: B0 + i * ZI, o: c, h: c, l: c, c, v: 1 }; });
  const r = await TSalt.turaSalt({ Salt: globalThis.Salt, SA: { puncte: () => [], azi: () => null, dovada: () => ({}), textDovada: () => "", areSalt: () => true }, Idei: { judecaActiune: () => { throw new Error("stricat"); } },
    univers: [{ isin: "A1", simbol: "AAA", nume: "Alfa", tip: "actiune" }], cereBare: async () => bare(), acum: B0 + 300 * ZI, jurnal: (t) => j.push(t) });
  assert.deepEqual(r.idei, []); assert.equal(r.ideiErori, 1); assert.ok(j.some((t) => /erori.*1|1.*erori/.test(t)), j.join(" | "));
});
await test("(E) versiunea de la v100.125 în sus / colector de la v101.83 în sus", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(2[5-9]|[3-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(2[5-9]|[3-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(2[5-9]|[3-9]\d)</);   // v100.126: lărgit
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(2[5-9]|[3-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(2[5-9]|[3-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(2[5-9]|[3-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(2[5-9]|[3-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(8[3-9]|9\d)";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
