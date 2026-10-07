// Proba v100.129 (07.10, el: „fa idei” după v100.128): cele 4 idei din raport pe caseta Monte Carlo pe simbol -
// (1) Enter în câmp + ultimele 10 simboluri, (2) alegerea botului când sunt mai mulți pe aceeași monedă, (3) „Compară 6 variante”
// pe aceleași drumuri, (4) 🎲 din pozițiile T212 / Salt: prețul tău de intrare și stopul poziției.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
const MSE = citeste("public", "lib", "monte-simbol-ecran.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const M = globalThis.MonteSimbol, G = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.129 · Monte Carlo pe simbol: cele 4 idei · proba\n");
const ZI = 864e5;
function bareZi(n, seed) { const g = M.generator(seed), b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.06); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v: 1 }); } return b; }
function bare15(zile, seed) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const bot = (o) => Object.assign({ activ: true, baza: "PONS.PERP", gridJos: 0.38, gridSus: 0.44, levier: 3, directie: "short", investit: 47.83, opritorPierdereActiv: true, opritorPierdere: 0.44, brut: { buOrderData: { row: 30 } } }, o);

// ---------------- (1) Enter + recente ----------------
await test("(1a) recentele: ultimul analizat primul, fără dubluri, cel mult 10; gunoiul (simboluri invalide, nu-listă) e ignorat", () => {
  assert.deepEqual(G.mcsRecente(["AAPL", "PONS"], "RHM.DE"), ["RHM.DE", "AAPL", "PONS"]);
  assert.deepEqual(G.mcsRecente(["AAPL", "PONS", "RHM.DE"], "PONS"), ["PONS", "AAPL", "RHM.DE"]);
  assert.equal(G.mcsRecente(Array.from({ length: 15 }, (_, i) => "S" + i), "X").length, 10);
  assert.deepEqual(G.mcsRecente(null, "AAPL"), ["AAPL"]);
  assert.deepEqual(G.mcsRecente(["<b>", "AAPL"], "PONS"), ["PONS", "AAPL"]);
});
await test("(1b) caseta: rândul „recente” deasupra scurtăturilor; Enter în câmp pornește analiza, Enter în stop / țintă reface simularea", () => {
  const h = G.mcsHtml({ recente: ["RHM.DE", "PONS"], scurtaturi: ["BE"] });
  assert.match(h, /recente:<\/span><button[^>]*mcsAlege\('RHM\.DE'\)/);
  assert.ok(h.indexOf("recente:") < h.indexOf("mcsAlege('BE')"));
  assert.match(MSE, /addEventListener\("keydown"/); assert.match(functie(MSE, "mcsTasta"), /Enter/);
  assert.match(functie(MSE, "mcsTasta"), /mcsAnalizeaza\(\)/); assert.match(functie(MSE, "mcsTasta"), /mcsResimuleaza\(\)/);
  assert.match(functie(MSE, "mcsAnalizeaza"), /mcsSalveazaRecente\(/);
});

// ---------------- (2) mai mulți boți pe aceeași monedă ----------------
await test("(2a) doi boți activi pe PONS: lista lor, alegerea după poziție (al doilea ⇒ setările lui), fără alegere ⇒ primul", () => {
  const b = [bot({}), bot({ directie: "long", gridJos: 0.35, gridSus: 0.45, levier: 2, investit: 20, opritorPierdereActiv: false, brut: { buOrderData: { row: 11 } } }), bot({ baza: "BE.PERP" })];
  assert.equal(G.mcsBotiPe(b, "PONS").length, 2);
  assert.equal(G.mcsSetariBot(b, "PONS").dir, "short");
  const s2 = G.mcsSetariBot(b, "PONS", 1); assert.equal(s2.dir, "long"); assert.equal(s2.grile, 10); assert.equal(s2.stop, null); assert.equal(s2.botulTau, true);
  assert.equal(G.mcsSetariBot(b, "PONS", 7).dir, "short", "indice în afara listei ⇒ primul");
  const e = G.mcsEticheteBoti(b, "PONS"); assert.equal(e.length, 2); assert.match(e[0], /short 3×/); assert.match(e[1], /long 2×/); assert.match(e[1], /20,00 USDT/);
});
await test("(2b) caseta: cu 2+ boți pe monedă apare alegerea (select cu change ⇒ mcsAlegeBot), cu unul singur nu", () => {
  const rez = (boti) => ({ sim: "PONS", tip: "coin", pret: 0.4, pretMc: { eroare: "x" }, setari: G.mcsSetariBot([bot({})], "PONS"), grid: { eroare: "y" }, ist: { r: { cazuri: 0 } }, boti: boti, botIdx: 1 });
  const h2 = G.mcsHtml({ sim: "PONS", rez: rez(["short 3× …", "long 2× …"]) });
  assert.match(h2, /<select id="mcsBotAles" data-action-change="mcsAlegeBot\(this\.value\)">/); assert.match(h2, /<option value="1" selected>long 2× …<\/option>/);
  assert.match(h2, /ai 2 boți activi pe PONS/);
  assert.doesNotMatch(G.mcsHtml({ sim: "PONS", rez: rez(["short 3× …"]) }), /mcsBotAles/);
});

// ---------------- (3) variantele ----------------
await test("(3a) variantele: botul tău + îngust / larg (același centru) + levier ±1 + grile ½ / ×2; stopul se mută cu marginea (nu ajunge în grid)", () => {
  const st = G.mcsSetariBot([bot({})], "PONS"), v = G.mcsVariante(st);
  assert.equal(v[0].nume, "așa cum e"); assert.equal(v.length, 7);
  const ing = v.find((x) => /îngust/.test(x.nume)).st, lar = v.find((x) => /larg/.test(x.nume)).st;
  assert.ok(Math.abs((ing.jos + ing.sus) / 2 - 0.41) < 1e-9 && Math.abs(ing.sus - ing.jos - 0.03) < 1e-9);
  assert.ok(Math.abs(lar.sus - lar.jos - 0.09) < 1e-9);
  assert.ok(Math.abs(lar.stop.sus - lar.sus) < 1e-9, "stopul short era chiar pe margine ⇒ rămâne pe marginea nouă, nu în grid");
  assert.ok(lar.stop.sus >= lar.sus && ing.stop.sus >= ing.sus);
  assert.deepEqual(v.map((x) => x.st.levier).sort(), [2, 3, 3, 3, 3, 3, 4]);
  assert.ok(v.some((x) => x.st.grile === 15) && v.some((x) => x.st.grile === 58));
  const l1 = G.mcsVariante(Object.assign({}, st, { levier: 1, dir: "long", stop: { jos: 0.36 } }));
  assert.equal(l1.length, 6, "levier 1 ⇒ fără „levier mai mic”");
  const lr = l1.find((x) => /larg/.test(x.nume)).st; assert.ok(lr.stop.jos < lr.jos && Math.abs(lr.jos - lr.stop.jos - 0.02) < 1e-9, "stopul long păstrează distanța sub margine");
  assert.ok(G.mcsVariante(Object.assign({}, st, { jos: 0.01, sus: 1 })).every((x) => x.st.jos > 0), "jos rămâne peste zero");
});
await test("(3b) simularea variantelor: aceleași drumuri (aceeași sămânță) ⇒ „așa cum e” iese identic cu cardul botului; rândurile au cifrele grilei", () => {
  const b = bare15(31, 5), st = { jos: 0.95, sus: 1.05, grile: 20, levier: 2, dir: "neutru", suma: 50, stop: null, botulTau: false };
  const r = G.mcsCalcVariante(b, st, 1, { n: 120 });
  const g = M.grid(b, Object.assign({ pret: 1 }, st), { zile: 7, n: 120, seed: 12 });
  assert.equal(r[0].g.p50, g.p50); assert.equal(r.length, 7);
  r.forEach((x) => { assert.ok(isFinite(x.g.p50) && x.g.pPlus >= 0 && x.g.pPlus <= 1); });
});
await test("(3c) „ce aș face eu”: alta doar dacă e mai bună cu cel puțin 1 USDT ȘI 2% din sumă, fără lichidare peste 2%; altfel „păstrează”", () => {
  const rd = (nume, p50, liq) => ({ nume, st: { suma: 50 }, g: { p50, pLichidare: liq } });
  assert.match(G.mcsVariantaBuna([rd("așa cum e", -5), rd("mai îngust", -4.5, 0), rd("mai larg", -6, 0)]), /^Păstrează/);
  assert.match(G.mcsVariantaBuna([rd("așa cum e", -5), rd("mai îngust", -2, 0), rd("levier mai mare", 1, 0.1)]), /mai îngust/);
  assert.doesNotMatch(G.mcsVariantaBuna([rd("așa cum e", -5), rd("mai îngust", -2, 0), rd("levier mai mare", 1, 0.1)]), /levier mai mare/);
});
await test("(3d) caseta: butonul „Compară 6 variante”; după calcul, tabelul (o zecimală la bani) + „ce aș face eu” + nota că e același istoric", () => {
  const st = G.mcsSetariBot([bot({})], "PONS"), base = { sim: "PONS", tip: "coin", pret: 0.4, pretMc: { eroare: "x" }, setari: st, ist: { r: { cazuri: 0 } },
    grid: { n: 10, zile: 7, zileIstoric: 31, p5: -8, p50: -5, p95: 8, pLichidare: 0, pIesire: 1, pStop: 0.7, pPlus: 0.3, perechiMedii: 100, hist: null } };
  assert.match(G.mcsHtml({ sim: "PONS", rez: base }), /data-action-click="mcsCompara\(\)">Compară 6 variante/);
  const rows = G.mcsVariante(st).map((v, i) => ({ nume: v.nume, st: v.st, g: { p5: -8 - i, p50: -5 + i * 0.123, pPlus: 0.3, pStop: 0.7, pLichidare: 0 } }));
  const h = G.mcsHtml({ sim: "PONS", rez: Object.assign({}, base, { variante: rows }) });
  assert.match(h, /<table class="t212Tab mcsVar">/); assert.match(h, /−4,9 USDT/); assert.match(h, /Ce aș face eu:/); assert.match(h, /aceleași drumuri/);
  assert.doesNotMatch(h, /Compară 6 variante/);
});

// ---------------- (4) poziția: prețul de intrare ----------------
await test("(4a) MonteSimbol.pret cu intrare: atinge intrarea (peste ⇒ maximul, sub ⇒ minimul) și „peste intrare la capăt” = pSus când intrarea e +10% și pragul 10%", () => {
  const b = bareZi(300, 9);
  const r1 = M.pret(b, { orizonturi: [20], n: 500, seed: 3, prag: 0.1, intrare: 1.1 }).orizonturi[0];
  assert.equal(r1.pPesteIntrare, r1.pSus); assert.ok(r1.pIntrare >= r1.pPesteIntrare && r1.pIntrare <= 1);
  const r2 = M.pret(b, { orizonturi: [20], n: 500, seed: 3, intrare: 1.3 }).orizonturi[0]; assert.ok(r2.pIntrare <= r1.pIntrare);
  const r3 = M.pret(b, { orizonturi: [20], n: 500, seed: 3, intrare: 0.9 }).orizonturi[0]; assert.ok(r3.pIntrare > 0 && r3.pIntrare < 1); assert.ok(r3.pPesteIntrare > 0.5, "intrarea sub preț ⇒ de obicei rămâi peste");
  assert.equal(M.pret(b, { orizonturi: [20], n: 50, seed: 3 }).orizonturi[0].pIntrare, undefined);
});
await test("(4b) calculul pe poziție: stopul poziției ⇒ stopPct față de prețul ei, intrarea față de prețul ei (unitățile T212 / Salt nu contează), nivelText spune „poziția ta”", () => {
  const d = { tip: "stock", sim: "RHM.DE", b: bareZi(300, 4), ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, { poz: { sim: "RHM.DE", pret: 9454, intrare: 13496, stop: 8508.6 } });
  assert.ok(Math.abs(r.pretMc.stopPct - 0.1) < 1e-9); assert.ok(Math.abs(r.poz.intrareR - 13496 / 9454) < 1e-9);
  assert.match(r.nivelText, /stopul poziției tale/);
  const h = G.mcsHtml({ sim: "RHM.DE", rez: r });
  assert.match(h, /Poziția ta: ai intrat la 13\.496,00/); assert.match(h, /atinge prețul tău de intrare/); assert.match(h, /la capăt peste intrare, fără stop/);
  const r2 = G.mcsCalculeaza(d, { poz: { sim: "RHM.DE", pret: 100, intrare: 90, stop: 120 } });
  assert.ok(Math.abs(r2.pretMc.stopPct - 0.1) < 1e-9, "stop deasupra prețului (greșit) ⇒ stopul obișnuit");
});
await test("(4d) stopul poziției deja DEPĂȘIT (RHM 07.10: preț 936,6, stop 1.109,1): se spune, nu „n-are stop”", () => {
  const d = { tip: "stock", sim: "RHM.DE", b: bareZi(300, 4), ist: { r: { cazuri: 0 } } };
  const r = G.mcsCalculeaza(d, { poz: { sim: "RHM.DE", pret: 936.6, intrare: 1349.6, stop: 1109.08 } });
  assert.match(r.nivelText, /stopul poziției \(1\.109,08\) e deja depășit/); assert.doesNotMatch(r.nivelText, /n-are stop/);
  assert.match(G.mcsHtml({ sim: "RHM.DE", rez: r }), /stopul poziției 1\.109,08 \(DEPĂȘIT: prețul e sub el\)/);
  assert.match(G.mcsCalculeaza(d, { poz: { sim: "RHM.DE", pret: 936.6, intrare: 1349.6, stop: null } }).nivelText, /n-are stop/);
});
await test("(3e) „ce aș face eu” când și cea mai bună variantă pierde de obicei: se spune că toate ies pe minus (levierul mai mic doar pierde mai puțin)", () => {
  const rd = (nume, p50) => ({ nume, st: { suma: 50 }, g: { p50, pLichidare: 0, pPlus: 0.3 } });
  assert.match(G.mcsVariantaBuna([rd("așa cum e", -5.6), rd("levier mai mic", -3.8), rd("mai larg", -7)]), /și așa iese de obicei pe minus/);
  assert.match(G.mcsVariantaBuna([rd("așa cum e", -5.6), rd("mai îngust", -5.4)]), /toate variantele ies de obicei pe minus/);
  assert.doesNotMatch(G.mcsVariantaBuna([rd("așa cum e", 1), rd("mai îngust", 4)]), /pe minus/);
});
// ---------------- revizia Opus (07.10) ----------------
await test("(R1) „ce aș face eu” nu recomandă un pariu doar mai MARE: mijlocul mai bun cu coada de jos mai rea și același „pe plus” (levier mai mare) nu e recomandat", () => {
  const rd = (nume, p50, p5, pPlus) => ({ nume, st: { suma: 50 }, g: { p50, p5, pPlus, pLichidare: 0 } });
  assert.match(G.mcsVariantaBuna([rd("așa cum e", 4, -11.8, 0.62), rd("levier mai mare", 6, -17.7, 0.62)]), /^Păstrează/);
  assert.match(G.mcsVariantaBuna([rd("așa cum e", 4, -11.8, 0.62), rd("mai îngust", 6, -10, 0.66)]), /mai îngust/);
  assert.match(G.mcsVariantaBuna([rd("așa cum e", 4, -11.8, 0.62), rd("mai îngust", 6, -10, 0.60)]), /^Păstrează/, "pe plus mai rar ⇒ nu");
});
await test("(R2) „Refă simularea” nu lipește poziția altui simbol; 🎲 apăsat în timpul altei analize se ține minte și pornește după ea", () => {
  const f = functie(MSE, "mcsResimuleaza"); assert.match(f, /mcsStare\.poz && mcsStare\.poz\.sim === d\.sim \? mcsStare\.poz : null/);
  assert.match(functie(MSE, "mcsPozitie"), /mcsStare\.inLucru\) \{ mcsStare\.reia = true/); assert.match(functie(MSE, "mcsAnalizeaza"), /mcsStare\.reia/);
});
await test("(R3) „la capăt ești peste intrare” cu stopul: doar drumurile care n-au atins stopul înainte (≤ cel fără stop); amândouă pe pagină", () => {
  const b = bareZi(300, 9), r = M.pret(b, { orizonturi: [60], n: 600, seed: 3, stopPct: 0.08, intrare: 1.1 }).orizonturi[0];
  assert.ok(r.pPesteIntrareStop <= r.pPesteIntrare && r.pPesteIntrareStop >= 0); assert.ok(r.pPesteIntrareStop < r.pPesteIntrare, "pe 60 de zile cu −8% unele drumuri ating stopul");
  const d = { tip: "stock", sim: "RHM.DE", b: bareZi(300, 4), ist: { r: { cazuri: 0 } } };
  const h = G.mcsHtml({ sim: "RHM.DE", rez: G.mcsCalculeaza(d, { poz: { sim: "RHM.DE", pret: 9454, intrare: 13496, stop: 8508.6 } }) });
  assert.match(h, /la capăt peste intrare, fără să fi atins stopul \(−10,0%\)/); assert.match(h, /la capăt peste intrare, fără stop/);
});
await test("(R-min) variantele: stopul scris ÎN grid ⇒ pus la marginea gridului; „mai larg” păstrează stopul; fără rânduri identice; grile 2 ⇒ fără „jumătate”", () => {
  const st = { jos: 1, sus: 2, grile: 20, levier: 2, dir: "long", suma: 50, stop: { jos: 1.2 }, botulTau: true };
  G.mcsVariante(st).filter((v) => /îngust|larg/.test(v.nume)).forEach((v) => { if (v.st.stop) assert.ok(v.st.stop.jos <= v.st.jos + 1e-12, v.nume + ": stopul în grid"); });
  const lat = G.mcsVariante({ jos: 0.01, sus: 1, grile: 20, levier: 2, dir: "long", suma: 50, stop: { jos: 0.005 } }).find((x) => /larg/.test(x.nume));
  assert.ok(lat.st.stop && lat.st.stop.jos > 0 && lat.st.stop.jos < lat.st.jos); assert.doesNotMatch(lat.nume, /×1,5/);
  const v2 = G.mcsVariante({ jos: 1, sus: 2, grile: 2, levier: 1, dir: "long", suma: 50, stop: null });
  assert.ok(!v2.some((x) => /jumătate din grile/.test(x.nume)));
  assert.match(functie(MSE, "mcsCompara"), /varianteEroare/); assert.doesNotMatch(functie(MSE, "mcsCompara"), /mcsStare\.eroare =/);
  assert.match(functie(MSE, "mcsCalcVariante"), /faraCuTendinta: true/);
  assert.match(citeste("public", "lib", "t212-ecran.js"), /mcsPozButon\(t212\.simbolPret\[p\.ticker\] \|\| p\.simbol, /);
});
await test("(4c) butoanele 🎲: în detaliul poziției T212 și Salt, cu simbolul, prețul de acum, intrarea și stopul; mcsPozitie deschide pagina Monte Carlo", () => {
  const t = citeste("public", "lib", "t212-ecran.js"), s = citeste("public", "lib", "salt-ecran.js");
  assert.match(t, /mcsPozButon\(t212\.simbolPret\[p\.ticker\] \|\| p\.simbol, p\.pret, p\.pretMediu, n \? n\.stopPozitie : null\)/); assert.match(s, /mcsPozButon\(p\.simbol, pr, a\.p\.pretMediu, n \? n\.stopPozitie : null\)/);
  assert.match(functie(MSE, "mcsPozitie"), /navTo\("montecarlo"/); assert.match(functie(MSE, "mcsPozitie"), /mcsAnalizeaza\(\)/);
  assert.equal(G.mcsPozArg(1349.6), "1349.6"); assert.equal(G.mcsPozArg(0.000012345), "0.000012345"); assert.equal(G.mcsPozArg(null), "null"); assert.equal(G.mcsPozArg(NaN), "null");
  assert.match(G.mcsPozButon("RHM.DE", 945.4, 1349.6, 903.41), /^<button type="button" class="t212BtnLinie" data-action-click="mcsPozitie\('RHM\.DE',945\.4,1349\.6,903\.41\)">🎲 Monte Carlo pe poziție<\/button>$/);
  assert.equal(G.mcsPozButon("<x>", 1, 1, 1), "");
});
await test("(E) versiunea v100.129 (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.129"/); assert.match(html, /id="antetVersiune">v100\.129 /); assert.match(html, /id="healthAppVersion">v100\.129</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.129.0"); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-129";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.129"/); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.129");
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
