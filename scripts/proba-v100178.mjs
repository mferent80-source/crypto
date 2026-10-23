// Probele v100.178 (13.10.2026, el: „fă 1, 2, 3, 4, 5 și vreau exemple de top stocks pe sectoare în pagina Sugestii”) — factorii și
// sectoarele, atribuirea, MAE / MFE, ținta de volatilitate, mișcarea așteptată de opțiuni față de grid, topul pe sectoare.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.178 · factori, atribuire, MAE/MFE, volatilitate, opțiuni, topul pe sectoare · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "factori.js"), ctx);
const F = ctx.Factori, ZI = 86400000, T0 = Date.parse("2025-01-02T15:00:00Z");
const aproape = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, (m || "") + " " + a + " ≠ " + b);
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const zile = (n) => Array.from({ length: n }, (_, i) => new Date(T0 + i * ZI).toISOString().slice(0, 10));

await test("regresia: recuperează coeficienții unei combinații cunoscute (y = 0,001 + 1,5·a − 0,5·b + zgomot mic)", () => {
  const r = mb(1), X = [], y = []; for (let i = 0; i < 300; i++) { const a = (r() - 0.5) * 0.04, b = (r() - 0.5) * 0.03; X.push([a, b]); y.push(0.001 + 1.5 * a - 0.5 * b + (r() - 0.5) * 0.0005); }
  const g = F.regresie(y, X); aproape(g.b[0], 1.5, 0.02); aproape(g.b[1], -0.5, 0.03); aproape(g.alfa, 0.001, 0.0002); assert.ok(g.r2 > 0.99);
  assert.equal(F.regresie(y.slice(0, 5), X.slice(0, 5)), null, "prea puține zile");
});
await test("factorii unei acțiuni: piața, firmele mici, momentum, sectorul (față de piață), pe zilele comune", () => {
  const r = mb(2), z = zile(250), f = { SPY: {}, IWM: {}, MTUM: {}, XLK: {} }, s = {};
  z.forEach((d) => { const m = (r() - 0.5) * 0.02, sz = (r() - 0.5) * 0.01, mo = (r() - 0.5) * 0.01, se = (r() - 0.5) * 0.015; f.SPY[d] = m; f.IWM[d] = m + sz; f.MTUM[d] = m + mo; f.XLK[d] = m + se; s[d] = 1.2 * m + 0.8 * sz + 0.3 * mo + 1.1 * se + (r() - 0.5) * 0.002; });
  const fa = F.factoriActiune(s, f, "XLK"); aproape(fa.piata, 1.2, 0.05); aproape(fa.mici, 0.8, 0.08); aproape(fa.momentum, 0.3, 0.08); aproape(fa.sector, 1.1, 0.06); assert.equal(fa.etf, "XLK");
});
await test("expunerea: sectoarele ca % din acțiuni, concentrarea peste 40 % marcată, industria (semiconductori) separat", () => {
  const e = [{ cheie: "T:A", nume: "A", simbol: "A", clasa: "actiuni", notionalLei: 600 }, { cheie: "T:B", nume: "B", simbol: "B", clasa: "actiuni", notionalLei: 300 }, { cheie: "T:C", nume: "C", simbol: "C", clasa: "actiuni", notionalLei: 100 }, { cheie: "C:X", nume: "X", clasa: "crypto", notionalLei: 999 }];
  const info = { A: { sector: "Technology", industrie: "Semiconductors" }, B: { sector: "Technology", industrie: "Semiconductors" }, C: { sector: "Energy" } };
  const x = F.expunere(e, info, { "T:A": { piata: 1.5 }, "T:B": { piata: 1 } });
  assert.equal(x.actiuniLei, 1000); assert.equal(x.sectoare[0].ro, "Tehnologie"); aproape(x.sectoare[0].pondere, 0.9, 1e-12); assert.equal(x.sectoare[0].pestePrag, true); assert.equal(x.sectoare[1].pestePrag, false);
  assert.equal(x.industrii[0].nume, "Semiconductors"); aproape(x.factori.piata, 1200, 1e-9); aproape(x.acoperire, 0.9, 1e-12);
});
await test("atribuirea: beta, randamentul „pasiv” (beta × reper) și alfa; un cont = 2 × S&P are alfa ≈ 0", () => {
  const r = mb(3), s = [], rep = {}; zile(200).forEach((d) => { const m = (r() - 0.5) * 0.02; rep[d] = m; s.push({ z: d, r: 2 * m }); });
  const a = F.atribuire(s, rep); aproape(a.beta, 2, 1e-9); aproape(a.alfa, 0, 1e-9); aproape(a.tu, a.pasiv, 1e-9);
  const s2 = s.map((x) => ({ z: x.z, r: x.r + 0.001 })), a2 = F.atribuire(s2, rep); assert.ok(a2.alfa > 0.15, "un plus constant de 0,1 % pe zi = alfa pozitiv: " + a2.alfa);
});
await test("boții: realizatul Pionex = grila + direcția; netul = + comisioane + finanțare (pe ultimul an)", () => {
  const d = F.descompunereBoti([{ inchis: 10, rezultat: -5, grile: 3, comisioane: -1, funding: -0.5, pus: 100 }, { inchis: 20, rezultat: 4, grile: 1, comisioane: -0.4, funding: 0.1, pus: 50 }, { inchis: 1, rezultat: 100, grile: 0 }], 5);
  assert.equal(d.n, 2); aproape(d.grila, 4, 1e-12); aproape(d.directie, -5, 1e-12); aproape(d.comisioane, -1.4, 1e-12); aproape(d.finantare, -0.4, 1e-12); aproape(d.net, -2.8, 1e-12);
});
await test("MAE / MFE: cât a coborât și cât a urcat fiecare trade; stopul care păstra 80 % din câștigători și pierderile pe care le-ar fi tăiat", () => {
  const inchise = [], bare = {};
  for (let k = 0; k < 20; k++) {   // 12 câștigători care au coborât cel mult 6 %, 8 pierzători care au coborât 20 %
    const tk = "S" + k, c = k < 12, b = [100, c ? 94 + (k % 3) : 90, c ? 104 : 85, c ? 110 : 80].map((p, i) => ({ t: T0 + i * ZI, c: p, l: p, h: p }));
    bare[tk] = b; inchise.push({ ticker: tk, pretCumparare: 100, pretVanzare: c ? 110 : 80, pornit: T0, inchis: T0 + 3 * ZI });
  }
  const m = F.maeMfe(inchise, bare); assert.equal(m.n, 20); assert.equal(m.castig, 12);
  aproape(m.stopSugerat, -0.06, 0.011); assert.equal(m.taiatePierderi, 8); assert.ok(m.economie > 0.1, "economie " + m.economie);
  aproape(m.mfeCastig, 0.10, 1e-9); aproape(m.lasatPeMasa, 0, 1e-9);
});
await test("ținta de volatilitate: volatilitatea anuală din P&L-ul pe zile de bursă; contribuția la risc însumează 100 %; mărimea cu risc egal", () => {
  const r = mb(4), z = zile(200), sa = {}, sb = {}, pnl = []; z.forEach((d) => { sa[d] = (r() - 0.5) * 0.04; sb[d] = (r() - 0.5) * 0.02; pnl.push([d, 10000 * sa[d] + 5000 * sb[d]]); });
  const t = F.tintaVol(pnl, 20000, 0.15, [{ cheie: "A", nume: "A", notionalLei: 10000 }, { cheie: "B", nume: "B", notionalLei: 5000 }], { A: sa, B: sb });
  assert.ok(t.volAnual > 0 && t.factor > 0); aproape(t.contrib.reduce((a, c) => a + c.pondere, 0), 1, 1e-9); assert.equal(t.contrib[0].nume, "A");
  const m = F.marimeVol(0.02, 20000, 0.15, 3); aproape(m.lei, 0.15 / Math.sqrt(252) * 20000 / 2 / 0.02, 1e-6);
});
await test("opțiunile: DVOL 52 % ⇒ ±2,7 % pe zi, ±7,2 % pe săptămână; o bandă de ±5 % e mai îngustă decât săptămâna așteptată", () => {
  aproape(F.miscareAsteptata(52, 1), 0.52 / Math.sqrt(365), 1e-12); aproape(F.miscareAsteptata(52, 7), 0.52 * Math.sqrt(7 / 365), 1e-12);
  const g = F.gridFataDeOptiuni({ dvol: 52, raportVol: 1, pret: 100, jos: 95, sus: 105 }); assert.equal(g.maiIngust, true); aproape(g.jumatate, 0.05, 1e-12);
  assert.ok(g.zilePanaLaMargine > 3 && g.zilePanaLaMargine < 4, "zile " + g.zilePanaLaMargine);
  assert.equal(F.gridFataDeOptiuni({ dvol: null, pret: 1, jos: 0.9, sus: 1.1 }), null);
});
await test("topul pe sector: doar cu trend în sus, ordonat după forța relativă pe 3 și 6 luni; istoricul regulii pe luni", () => {
  const r = mb(5), univers = [], bare = {};
  for (let k = 0; k < 8; k++) { const s = "T" + k, drift = (k - 3) * 0.0008, b = []; let p = 100; for (let i = 0; i < 420; i++) { p *= 1 + drift + (r() - 0.5) * 0.01; b.push({ t: T0 + i * ZI, c: p }); } bare[s] = b; univers.push({ s, nume: s, sector: "Technology", cap: 1e11 - k }); }
  const t = F.topSectoare(univers, bare, { n: 3 }); assert.equal(t.Technology.ro, "Tehnologie"); assert.deepEqual(Array.from(t.Technology.top.map((x) => x.s)).sort(), ["T5", "T6", "T7"]);
  assert.ok(t.Technology.top.every((x) => x.r6 > 0));
  const ist = F.istoricRegula(univers, bare, { n: 3 }); assert.ok(ist.luni >= 5); assert.ok(ist.medie > 0, "cu un drift pe acțiune, topul bate media: " + ist.medie);
});

// tura sectoarelor: universul curățat
const TS = await import("./lib/tura-sectoare.mjs");
await test("universul: fără acțiuni preferențiale / note (simbol cu ^, nume „Preferred / Notes”), BRK/B ⇒ BRK-B; topul pe sector din firmele mari din SUA", () => {
  const u = TS.curataUnivers([{ symbol: "AAPL", name: "Apple Inc. Common Stock", sector: "Technology", industry: "Computer Manufacturing", marketCap: "3e12", country: "United States" },
    { symbol: "ABR^D", name: "Arbor 6.375% Preferred", sector: "Real Estate", marketCap: "1e9", country: "United States" }, { symbol: "AGNCL", name: "AGNC Depositary Shares", sector: "Real Estate", marketCap: "2e10", country: "United States" },
    { symbol: "BRK/B", name: "Berkshire Hathaway Class B Common Stock", sector: "Finance", marketCap: "9e11", country: "United States" }, { symbol: "SAP", name: "SAP SE", sector: "Technology", marketCap: "3e11", country: "Germany" }]);
  assert.deepEqual(u.map((x) => x.s), ["AAPL", "BRK-B", "SAP"]); assert.equal(u[0].nume, "Apple Inc.");
  assert.deepEqual(TS.universTop(u, { minCap: 1e10 }).map((x) => x.s).sort(), ["AAPL", "BRK-B"], "doar SUA");
});
// serverul
await test("serverul: DVOL, universul (sectorul unui simbol), topul pe sectoare; verdictele primesc sursa „top-sector”", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`); let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.178.1." + (++ip) });
  const post = async (a, c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async (a) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { headers: h() }), env })).text());
  assert.equal(await post("dvol", { la: 1, btc: 52, eth: 60 }), 200); assert.equal((await get("dvol")).dvol.btc, 52); assert.equal(await post("dvol", { la: 1 }), 400);
  assert.equal(await post("universSua", { la: 1, harta: { NVDA: ["Technology", "Semiconductors"] } }), 200); const s = await get("sector&s=nvda"); assert.equal(s.sector, "Technology"); assert.equal(s.industrie, "Semiconductors");
  assert.equal(await post("sectoareTop", { la: 1, sectoare: [{ sector: "Technology", ro: "Tehnologie", top: [] }] }), 200); assert.equal((await get("sectoareTop")).sectoare.sectoare[0].ro, "Tehnologie");
  assert.equal(await post("verdict", { s: "top-sector", k: "NVDA", n: "top", p: 100, t: Date.now() }), 200);
});
// pagina Contul întreg: secțiunile noi
const ctxE = { TextRo: globalThis.TextRo }; vm.createContext(ctxE); vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctxE);
await test("pagina: „Pe ce pariezi de fapt” (industria peste 40 %), „Piață sau alegere” (alfa, grila / direcția), MAE / MFE cu stopul sugerat, volatilitatea contului", () => {
  const rap = { la: Date.now(), valoare: { total: 30000, complet: true, lipsa: [] }, risc: {}, reconciliere: {}, randament: {},
    factori: { actiuniLei: 20000, factori: { piata: 30000, mici: 2000, momentum: 4000, sector: 6000 }, sectoare: [{ nume: "Technology", ro: "Tehnologie", lei: 15000, pondere: 0.75, pozitii: ["MU", "WDC"], pestePrag: true }], industrii: [{ nume: "Semiconductors", lei: 12000, pondere: 0.6, pozitii: ["MU", "WDC", "STX"], pestePrag: true }], perPozitie: [{ nume: "MU", piata: 1.6, mici: 0.2, momentum: 0.4, etf: "SMH", sectorBeta: 0.9, r2: 0.7 }] },
    atribuire: { t212Spy: { tu: -0.11, pasiv: 0.25, alfa: -0.29, beta: 1.4 }, boti: { n: 120, grila: 300, directie: -2500, comisioane: -400, finantare: -50, net: -2650 }, usdLei: 4.4 },
    maeMfe: { n: 40, castig: 15, pierd: 25, maeCastig: -0.04, maePierd: -0.22, pierdDupaPlus5: 6, lasatPeMasa: 0.08, stopSugerat: -0.07, taiatePierderi: 14, economie: 0.12 },
    vol: { volAnual: 0.32, factor: 0.47, contrib: [{ nume: "APLD", pondere: 0.31 }] } };
  const h = ctxE.ciHtml(rap, { acum: rap.la });
  assert.match(h, /Acțiunile tale stau 60% într-o singură industrie \(Semiconductors: MU, WDC, STX\), peste pragul de 40 %/);
  assert.match(h, /alegerile tale \(alfa\) au adus −29,0%: un ETF pe S&amp;P cu aceeași expunere ar fi ieșit mai bine/);
  assert.match(h, /grila a adus \+300 USDT \(\+1\.320 lei\), direcția prețului −2500 USDT/); assert.match(h, /pierderea vine din direcție/);
  assert.match(h, /Un stop la −7,0% de la cumpărare ar fi păstrat 80 % din câștigători și ar fi tăiat mai devreme 14 pierderi/);
  assert.match(h, /Contul tău se mișcă cu ~32% pe an/); assert.match(h, /ar trebui ținută la ~47% din ce e/);
});
// Poarta T212: mărimea cu risc egal + concentrarea
const T = citeste("public", "lib", "t212-ecran.js"), fnT = (n) => { const i = T.indexOf("function " + n + "("); let a = 0, j = T.indexOf("{", i); for (; j < T.length; j++) { if (T[j] === "{") a++; else if (T[j] === "}") { a--; if (!a) break; } } return T.slice(i, j + 1); };
const ctxP = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, Factori: F }; ctxP.globalThis = ctxP; vm.createContext(ctxP);
vm.runInContext(citeste("public", "lib", "cont-intreg.js"), ctxP);
vm.runInContext(["t212Cate", "t212Suma", "t212Lei", "t212PoartaCont"].map(fnT).join("\n") + "\nvar escapeHtml = function (s) { return String(s); }; var t212 = { cont: null }; var ciStare = { raport: null }; var t212FaraSuma = function () { return null; };   /* v100.258: din v100.254 Poarta cere reconcilierea pentru sumă; aici suma e știută */ var getJSON = function () { return new Promise(function () {}); }; var t212RenderPoarta = function () {};", ctxP);
await test("Poarta T212: mărimea „cu risc egal” (ținta de 15 % pe an împărțită pe poziții) și avertismentul de concentrare pe sector după intrare", () => {
  const r = mb(9), bare = [{ t: T0, c: 100 }]; for (let i = 1; i < 130; i++) bare.push({ t: T0 + i * ZI, c: bare[i - 1].c * (1 + (r() - 0.5) * 0.04) });
  ctxP.ciStare.raport = { serii: {}, expuneri: [{ clasa: "actiuni", lei: 5000, cheie: "T:A" }, { clasa: "actiuni", lei: 5000, cheie: "T:B" }], valoare: { total: 30000 }, risc: {},
    factori: { actiuniLei: 10000, sectoare: [{ nume: "Technology", lei: 8000 }] } };
  ctxP.t212MarimePoarta = () => ({ suma: 3000 }); ctxP.t212.sectorCand = { s: "NVDA", v: "Technology" };
  const h = ctxP.t212PoartaCont({ simbol: "NVDA", ticker: "NVDA_US_EQ", bare, niv: null });
  assert.match(h, /⚖️ <b>Mărimea cu risc egal:<\/b> ~[\d.]+ lei \(se mișcă ~\+[\d,]+% pe zi; ținta contului de 15% pe an, împărțită pe 3 poziții\) - planul cu 1% risc dă ~3\.000 lei/);
  assert.match(h, /🧩 <b>Concentrare:<\/b> cu ea, Tehnologie ar fi 85% din acțiunile tale/);
});
await test("Poarta gridului: ce așteaptă opțiunile față de banda gridului (DVOL × raportul volatilităților)", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("var grDvol="), f = app.slice(i, app.indexOf("function grAsteptatHtml(", i));
  const c4 = { TextRo: globalThis.TextRo, Factori: F, escapeHtml: (s) => String(s), getJSON: () => new Promise(() => {}), renderGrid: () => {}, GridCalcul: { bare: (k) => k }, Promise, Date };
  vm.createContext(c4); vm.runInContext(f, c4);
  c4.grDvol.v = { btc: 52 }; c4.grDvol.la = Date.now(); c4.grDvol.rv.SOL_USDT_PERP = 1.5;
  const h = c4.grDvolHtml({ simbol: "SOL_USDT_PERP", pret: 100, setare: { jos: 95, sus: 105 } });
  assert.match(h, /📐 <b>Ce așteaptă opțiunile:<\/b> DVOL BTC 52%, moneda se mișcă de ~1,5× cât BTC ⇒ ±4,1% pe zi, ±10,8% pe săptămână; banda gridului are ±5,0%/); assert.match(h, /Banda e mai îngustă decât săptămâna așteptată/);
});
// Sugestii
const ctxS = { TextRo: globalThis.TextRo }; vm.createContext(ctxS); vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctxS);
await test("Sugestii: „Cele mai tari pe sectoare” — regula, istoricul cu avertismentul de supraviețuire, căsuța fiecărui sector, simbolul deschide Poarta", () => {
  assert.match(ctxS.sugSectoareHtml(null), /Topul se face o dată pe zi, de la 8:00/);
  const h = ctxS.sugSectoareHtml({ istoric: { luni: 14, medie: 0.006, luniPlus: 9 }, sectoare: [{ sector: "Technology", ro: "Tehnologie", etf: "XLK", n: 25, top: [{ s: "NVDA", nume: "NVIDIA Corporation", r3: 0.2, r6: 0.4, peste6: 0.25, max52: -0.01 }] }, { sector: "Energy", ro: "Energie", etf: "XLE", n: 25, top: [] }] });
  assert.match(h, /primele 3 din fiecare sector, ținute o lună, au făcut în medie \+0,6% pe lună față de media sectorului, pe plus în 9 din 14 luni/); assert.match(h, /⚠ Firmele sunt cele mari de AZI/);
  assert.match(h, /data-action-click="sugLaPoarta\('NVDA'\)">NVDA<\/button>/); assert.match(h, /3 luni \+20% · 6 luni \+40% \(sectorul: \+15%\) · −1% de la maximul pe un an/);
  assert.match(h, /nicio acțiune mare cu trend în sus acum/);
  const s = citeste("public", "lib", "sugestii-ecran.js"); assert.match(s, /sugActiuniPiata\("us", sa, pm, d\.idei, "📈", "Acțiuni US", acum\) \+ sugSectoareHtml\(d\.sectoare, acum\)/); assert.match(s, /action=sectoareTop/);
});
await test("legarea: factori.js în pagină și în cache; colectorul încarcă Factori și rulează tura sectoarelor; tura contului primește Factori", () => {
  assert.match(citeste("public", "index.html"), /<script src="\/lib\/factori\.js"><\/script>/); assert.match(citeste("public", "sw.js"), /"\/lib\/factori\.js"/);
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /const Factori = incarca\("factori\.js", "Factori"\)/); assert.match(c, /turaSectoareColector\(\)\.catch/); assert.match(c, /Factori, (Disciplina, botiAfara: \(\) => botiAfaraAcum\(\), )?bareZi: bareZiCont, botiInchisi/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
