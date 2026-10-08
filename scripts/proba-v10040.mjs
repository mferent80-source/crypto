// Proba v100.40 (30.09, el: „rezolvăm tot” dupa auditul din toate unghiurile) - pachetul BANI: cifrele dupa care decide el.
// 🔴 raportul de duminica si „Dacă ascultai de Radar” vedeau doar ultimii 10 boti (Pionex da pagini de 10): 27.09 raportul a zis
//    „10 boti, −18,39 USDT”, saptamana reala 26 boti, +24,51 brut / +8,48 net.
// 🔴 Acasa si banda de cont: „nimic roșu” cand 2 actiuni erau pe IEȘI (semaforul numarat din DOM-ul paginii T212) + contul inghetat.
// 🔴 Declaratia: dividendele 0,00 lei pe drumul Jurnal -> Acțiuni (se aduceau doar din pagina T212).
// 🟡 jurnalul/raportul/„Dacă ascultai” pe brut (statistica si Declaratia pe net) · „față de ieri dimineață” pe boti diferiti ·
//    CSV-ul contabilului: cost + rezultat ≠ incasat, formule (=,+,-,@), minus tipografic, 16 zecimale/exponent · ideile T212 cu
//    stopul −15% dar Biletul pe k×ATR (COKE: 3% risc in loc de 1%) · tinta pozitiei „fugea” cu pretul · maximul de dupa cumparare
//    includea ziua cumpararii · contrafactualul cerea lumanari pe tickerul gresit (LIGHTER_USDT_PERP) din ora in ora.
// LIB=<dosar> / RAD=<dosar> ruleaza proba pe alt cod (versiunea veche scoasa din git) - asa s-a vazut picand.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const LIB = path.join(RAD, "public", "lib");
const lib = (f) => fs.readFileSync(path.join(LIB, f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const JT = new Function(`${lib("jurnal-trade.js")}; return JurnalTrade;`)(); globalThis.JurnalTrade = JT;
const OB = new Function(`${lib("obiceiuri.js")}; return Obiceiuri;`)();
const CF = new Function(`${lib("contrafactual.js")}; return Contrafactual;`)();
const AC = new Function(`${lib("acasa.js")}; return Acasa;`)();
const T2 = new Function(`${lib("t212.js")}; return T212;`)(); globalThis.T212 = T2;
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;
const ID = new Function(`${lib("idei.js")}; return Idei;`)();
const colector = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
const t212Ecran = lib("t212-ecran.js"), acasaEcran = lib("acasa-ecran.js");
const { turaContrafactual } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-contrafactual.mjs")).href);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, (m || "") + " " + a + " != " + b);
console.log("\nV100.40 · pachetul BANI (raportul pe toata saptamana, netul, Acasa din date, dividendele, CSV, T212) · proba\n");

const ZI = 86400000, ACUM = Date.UTC(2026, 8, 27, 18);
// 26 de boti inchisi in ultima saptamana, cate unul la ~6 ore; realizat +1, comision −0,2, funding −0,1 -> net +0,7
const boti = Array.from({ length: 26 }, (_, i) => ({ strategyId: String(3000 + i), base: "CRV.PERP", createTime: ACUM - (i + 1) * 6 * 3600000 - 3600000, closeTime: ACUM - (i + 1) * 6 * 3600000,
  buOrderData: { totalRealizedProfit: "1", gridProfit: "0.8", totalFee: "-0.2", totalFundingFee: "-0.1", usdtInvestment: "50", leverage: "5", trend: "long", bottom: "0.37", top: "0.42", row: 10, gridType: "geometric" } }));

await test("🔴 colectorul: raportul de duminica si „Dacă ascultai” citesc TOTI botii inchisi (arhiva + prima pagina), nu ultimii 10", () => {
  assert.match(colector, /async function botiInchisiToti\(\)/);
  const tr = colector.slice(colector.indexOf("async function turaRaport("), colector.indexOf("async function turaRaport(") + 900);
  assert.match(tr, /JurnalTrade\.din\(await botiInchisiToti\(\)\)/, "turaRaport");
  assert.doesNotMatch(tr, /status=finished&limit=100/, "turaRaport nu mai citeste doar prima pagina");
  assert.match(colector, /cereBoti: botiInchisiToti/, "turaCf");
});

await test("🟡 jurnalul: fiecare bot are NETUL (realizat + comisioane + funding); rezumatul si raportul de duminica judeca pe net", () => {
  const l = JT.din(boti), r = JT.rezumat(l);
  aprox(l[0].net, 0.7, 1e-9, "net"); aprox(r.net, 26 * 0.7, 1e-9, "suma neta");
  assert.equal(r.pePlusNet, 26);
  const rap = OB.raportDuminica({ trades: l, acum: ACUM });
  assert.match(rap.linii[0], /26 de boți închiși, net \+18,20 USDT/, rap.linii[0]);   /* v100.72: virgula zecimală; „26 de boți” */
  assert.equal(rap.n, 26);
  // un bot pe plus brut dar pe minus net
  const b2 = JT.din([{ ...boti[0], buOrderData: { ...boti[0].buOrderData, totalRealizedProfit: "0.1", totalFee: "-0.3" } }]);
  assert.equal(JT.rezumat(b2).pePlusNet, 0, "+0,1 brut, −0,3 comision -> pe minus");
  assert.equal(CF.rezumat([{ t: b2[0], z: { nivel: "porneste" } }]).doarVerde < 0, true, "„Dacă ascultai” pe net");
});

await test("🟡 contrafactualul: tickerul REAL (LIGHTER -> LIT_USDT_PERP), cei mai noi intai, esecul marcat (nu reincercat din ora in ora)", async () => {
  const cerute = [], esuate = [];
  const lista = [
    { strategyId: "1", base: "LIGHTER.PERP", createTime: ACUM - 5 * ZI, closeTime: ACUM - 4 * ZI, buOrderData: { totalRealizedProfit: "-59", usdtInvestment: "100", trend: "long", initPrice: "4.4", bottom: "4", top: "4.8", row: 16 } },
    { strategyId: "2", base: "CRV.PERP", createTime: ACUM - 2 * ZI, closeTime: ACUM - ZI, buOrderData: { totalRealizedProfit: "1", usdtInvestment: "50", trend: "long", initPrice: "0.4", bottom: "0.37", top: "0.42", row: 8 } },
  ];
  await turaContrafactual({ cereBoti: async () => lista, cereKlines: async (s) => { cerute.push(s); throw new Error("fara lumanari"); },
    simbol: async (m) => ({ LIGHTER: "LIT_USDT_PERP" })[m] || m + "_USDT_PERP", esuat: (id) => esuate.push(id),
    gata: {}, GridCalcul: G, GridProba: null, JurnalTrade: JT, Contrafactual: CF, jurnal: () => {}, max: 5 });
  assert.deepEqual(cerute, ["CRV_USDT_PERP", "LIT_USDT_PERP"], "cel mai nou intai, tickerul real: " + cerute.join(","));
  assert.deepEqual(esuate.sort(), ["1", "2"]);
});

await test("🟡 „Față de ieri dimineață”: pe bot - LIGHTER inchis pe −59 intre timp intra in cifra (nu −3,23 din sumele a doi boti diferiti)", () => {
  const ieri = { zi: "2026-09-29", botiTotal: -19.37, botiPeId: { "2390": -19.37 } };
  const azi = { botiTotal: -3.23, botiPeId: { "2394": -3.23 } };
  const z = AC.ziuaTa(azi, [ieri], "2026-09-30", [{ id: "2390", net: -59.04 }]);
  aprox(z.boti, (-59.04 - -19.37) + -3.23, 1e-9, "ziua");
  // poza de ieri fara totalurile pe bot (pozele vechi) -> nu se spune o cifra falsa
  const vechi = AC.ziuaTa(azi, [{ zi: "2026-09-29", botiTotal: -19.37 }], "2026-09-30", []);
  assert.ok(vechi === null || vechi.boti === null, "fara totaluri pe bot ieri: randul nu se arata");
  // acelasi bot in ambele: diferenta simpla
  aprox(AC.ziuaTa({ botiPeId: { a: 5 } }, [{ zi: "2026-09-29", botiPeId: { a: 3 } }], "2026-09-30").boti, 2, 1e-9);
});

await test("🔴 Acasa si banda de cont: semaforul actiunilor din DATE (t212.nrIesi), nu din DOM-ul paginii T212; „aduc…” cat nu se stie", () => {
  assert.doesNotMatch(acasaEcran, /t212Pill-iesi/); assert.doesNotMatch(t212Ecran.slice(t212Ecran.indexOf("function contTotRender")), /querySelectorAll\("#t212Continut \.t212Pill-iesi"\)/);
  assert.match(t212Ecran, /t212\.nrIesi = /); assert.match(acasaEcran, /aduc prețurile…/);
  assert.match(t212Ecran, /Date\.now\(\) - \(t212\.contLa \|\| 0\) > 60000/, "contul se reia la 60 s");
});

await test("🔴 Declaratia: dividendele se aduc pe ORICE drum; cat nu sunt citite scrie „se încarcă…”/„necitite”, nu 0,00; Copiaza/CSV refuza", () => {
  assert.match(t212Ecran, /function t212AduDividende\(\)/); assert.match(t212Ecran, /function t212DivNecitite\(\)/);
  assert.match(t212Ecran, /Dividende încasate în ' \+ r\.an \+ '<\/td><td>' \+ \(t212DivNecitite\(\)/);
  const csv = t212Ecran.slice(t212Ecran.indexOf("function t212CsvDeclaratie"), t212Ecran.indexOf("function t212CsvDeclaratie") + 400);
  const cop = t212Ecran.slice(t212Ecran.indexOf("function t212CopiazaDeclaratia"), t212Ecran.indexOf("function t212CopiazaDeclaratia") + 400);
  assert.match(csv, /t212DivNecitite\(\)/); assert.match(cop, /t212DivNecitite\(\)/);
});

await test("🟡 CSV-ul contabilului: costul se leaga cu rezultatul, fara formule (=,+,-,@), minus ASCII in textul de copiat", () => {
  const r = T2.raportAnual({ an: 2026, inchise: [{ inchis: Date.UTC(2026, 1, 10), simbol: "=HYPERLINK(1)", qty: 1, cost: 700, incasat: 650, rezultat: -52.1, comisioane: 2.1 }], dividende: [], boti: [] });
  const rand = T2.csvDeclaratie(r).split("\n")[1];
  assert.match(rand, /;'=HYPERLINK\(1\);/, "formula neutralizata: " + rand);
  assert.match(rand, /;702,10;650,00;-52,10;/, "cost = incasat − rezultat: " + rand);
  assert.doesNotMatch(r.text, /−/, "fara minus tipografic in textul pentru contabil");
  const s = ST.csv([{ inchis: 1, pornit: 0, eticheta: "@SUM", baza: 100, rezultat: 0.0000001, comisioane: 1 / 3, levier: 5, dir: "long", durataOre: 1 }], "USDT").split("\n")[1];
  assert.doesNotMatch(s, /e-/, "fara exponent: " + s); assert.match(s, /;'@SUM;/); assert.match(s, /;0,3333;/); assert.match(s, /;100;/);
});

// bare zilnice sintetice cu trend in sus
function bareSus(n, pas) { const b = [], T0 = Date.UTC(2026, 0, 1); let p = 100; for (let i = 0; i < n; i++) { const o = p; p = p * (1 + pas / 100 + 0.01 * Math.sin(i)); b.push({ t: T0 + i * ZI, o, h: Math.max(o, p) * 1.01, l: Math.min(o, p) * 0.99, c: p }); } return b; }

await test("🟡 ideile T212: stopul afisat = stopul PROBAT (k×ATR, cel din Bilet), nu −15%", () => {
  // aceleasi bare ca in idei-v90 (trend in sus, fara miscare: trec poarta)
  const A0 = Date.UTC(2026, 8, 26, 6), b = Array.from({ length: 296 }, (_, i) => { const c = 100 * Math.pow(1.002, i) * (1 + 0.02 * Math.sin(i / 2)); return { t: A0 - (296 - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }; });
  const pret = b.at(-1).c, r = ID.judecaActiune(b, pret, { acum: A0 });
  assert.equal(r.trece, true, "bare de proba care trec poarta: " + (r.motive || []).join("; "));
  const n = AS.niveluri(b, pret, {});
  aprox(r.stop, n.stop, 1e-9, "stopul ideii"); assert.ok(Math.abs(r.stop - r.intrare * 0.85) > 1e-6, "nu −15%");
});

await test("🟡 tinta pozitiei e FIXA, de la pretul mediu (+2×risc) - nu „fuge” cu pretul de acum", () => {
  const b = bareSus(260, 0.2), p1 = b.at(-1).c;
  const n1 = AS.niveluri(b, p1, { pretMediu: 100 }), n2 = AS.niveluri(b, p1 * 1.05, { pretMediu: 100 });
  aprox(n1.tintaPozitie, Math.round((100 + 2 * n1.d) * 100) / 100, 0.01, "tinta din pretul mediu");
  aprox(n2.tintaPozitie - n1.tintaPozitie, 2 * (n2.d - n1.d), 0.02, "pretul de acum nu muta tinta (doar riscul)");
});

await test("🟡 maximul de dupa cumparare incepe cu ziua DE DUPA cumparare (ca proba cuStopUrcator); o singura functie in 3 locuri", () => {
  const T = Date.UTC(2026, 8, 1), b = [{ t: T, h: 150 }, { t: T + ZI, h: 120 }, { t: T + 2 * ZI, h: 125 }];
  assert.equal(AS.maxDupaCumparare(b, T + 10 * 3600000, 110), 125, "maximul zilei cumpararii (150) nu intra");
  assert.equal(AS.maxDupaCumparare(b, T + 10 * 3600000, 130), 130, "pretul de acum e si el dupa cumparare");
  assert.equal(AS.maxDupaCumparare([], T, 100), null);
  assert.match(colector, /ActiuniSemnale\.maxDupaCumparare\(bare, x\.initialFillDate, x\.currentPrice\)/);
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8"), /d\.ActiuniSemnale\.maxDupaCumparare\(/);
  assert.match(t212Ecran, /ActiuniSemnale\.maxDupaCumparare\(b, de, x\.currentPrice\)/);
});

// ---------------- pachetul ALERTE (lantul alertelor) ----------------
const poza = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "poza.mjs")).href);
const discord = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "canal-discord.mjs")).href);
const { creeazaYahooExtra } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "yahoo-extra.mjs")).href);
const AL = new Function("GridCalcul", `${lib("alerte.js")}; return Alerte;`)(G);

await test("🟡 alertele o data pe zi pe actiuni: cheia = ziua SESIUNII NY (la 03:03 ora Romaniei nu se mai retrimit toate)", () => {
  assert.equal(typeof poza.ziSesiune, "function");
  assert.equal(poza.ziSesiune(Date.parse("2026-09-30T00:03:00Z")), "2026-09-29", "03:03 RO = sesiunea de ieri, aceeasi cheie ca seara");
  assert.equal(poza.ziSesiune(Date.parse("2026-09-30T14:00:00Z")), "2026-09-30", "dupa deschidere, sesiunea de azi");
  assert.equal(poza.ziSesiune(Date.parse("2026-10-05T10:00:00Z")), "2026-10-02", "luni inainte de deschidere = vinerea");
});

await test("🟡 Discord: fara @everyone/@here din texte; alerta refuzata intra in COADA pe disc si se reincearca (nu se pierde)", () => {
  assert.deepEqual(discord.mesajDiscord({ nivel: "critic", titlu: "@everyone" }).allowed_mentions, { parse: [] });
  assert.match(colector, /coadaDiscord\.push\(/); assert.match(colector, /async function golesteCoada\(\)/); assert.match(colector, /golesteCoada\(\)\.catch/);
});

await test("🟡 poza: botii poarta ora CITIRII lor (nu „acum” peste boti vechi cand Pionex nu raspunde)", () => {
  assert.match(colector, /ultimiiBoti = boti; ultimiiBotiLa = Date\.now\(\)/);
  assert.match(colector, /la: ultimiiBotiLa \|\| Date\.now\(\) \}\)/);
  assert.doesNotMatch(colector, /semafor: x && x\.semafor \? x\.semafor : null, la: Date\.now\(\) \}\)/);
});

await test("🟡 serverul mort: colectorul spune pe Discord inainte sa iasa; T212 cazut: alerta dupa 30 min (nu tacere)", () => {
  const i = colector.indexOf('jurnal("ies: serverul nu mai răspunde")'), bucata = colector.slice(i, i + 900);
  assert.ok(i > 0 && /trimiteDiscord\(MesajeColector\.serverOprit\(MAX_ESECURI\)/.test(bucata), "anuntul inainte de process.exit");   /* v100.66: mesajul vine din scripts/lib/mesaje-colector.mjs */
  assert.ok(bucata.indexOf("trimiteDiscord") < bucata.indexOf("process.exit"));
  assert.match(colector, /async function t212Sanatate\(e\)/); assert.match(colector, /await t212Sanatate\(e\); throw e;/);
});

await test("🟡 perechile incheiate: in Radar fiecare, pe Discord un rezumat pe ora; IESI-ul semaforului nu repeta alerta planului", () => {
  const b = { id: "1", baza: "JTO.PERP", brut: { buOrderData: { closedExchangeOrderCount: "12" } }, ordinePerechi: 5, gridProfitBrut: 0.9, pozitie: 10 };
  const g = AL.grila(b, { u: 10, per: 3, g: 0.7, poz: 10 });
  assert.equal(g.mesaje[0].perechi, 2); aprox(g.mesaje[0].usdt, 0.2, 1e-9);
  assert.match(colector, /msg\.doarRadar = true/); assert.match(colector, /async function turaPerechiOra\(\)/);
  const bot = { id: "2", baza: "JTO.PERP", directie: "long", levier: 5, investit: 100, profitTotal: -16, pretCurent: 0.55, gridJos: 0.5, gridSus: 0.6, distantaLichidarePct: 20 };
  const out = AL.reguli(bot, { plan: { atins: ["minus"], minus: { prag: 15 } }, semnale: { semafor: { nivel: "iesi", cod: "plan", motiv: "planul tău", faCe: "Ieși" } } }, {});
  assert.equal(out.plan.nivel, "critic"); assert.notEqual(out["s-iesi"].nivel, "critic", "acelasi fapt nu vine pe doua alerte critice");
  const alt = AL.reguli(bot, { semnale: { semafor: { nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la 5%", faCe: "Ieși" } } }, {});
  assert.equal(alt["s-iesi"].nivel, "critic", "IESI din alt motiv ramane critic");
});

await test("🟡 starea alertelor scrisa ATOMIC; ritmurile scumpe (laborator, clasament) tinute minte peste reporniri", () => {
  assert.doesNotMatch(colector, /fs\.writeFileSync\(STARE_FIS, JSON\.stringify\(stareAlerte\)\)/);
  assert.match(colector, /function scrieAtomic\(fis, obj\) \{ const tmp = fis \+ "\.tmp"; fs\.writeFileSync\(tmp, JSON\.stringify\(obj\)\); fs\.renameSync\(tmp, fis\); \}/);
  assert.match(colector, /let laboratorLa = Math\.max\(Date\.now\(\) - LABORATOR_MS \+ 30 \* 60000, Number\(ritm\.laborator\) \|\| 0\)/);
});

await test("🟡 Yahoo: la 401 crumb-ul se reface pe loc; simbolul inexistent (404) tinut minte, nu cerut la 2 minute", async () => {
  const cereri = []; let crumbN = 0;
  const f = async (u) => {
    cereri.push(u);
    if (u.startsWith("https://fc.yahoo.com")) return { headers: { get: () => "A=1; path=/" } };
    if (u.includes("getcrumb")) { crumbN++; return { ok: true, status: 200, text: async () => "crumb" + crumbN }; }
    if (u.includes("COTIUSDT")) return { ok: false, status: 404, json: async () => ({}) };
    if (u.includes("quoteSummary")) return u.includes("crumb1") ? { ok: false, status: 401, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ quoteSummary: { result: [{}] } }) };
    if (u.includes("COTIUSDT")) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: false, status: 500 };
  };
  const fis = path.join(process.env.TEMP || process.env.TMPDIR || ".", "proba-v10040-yahoo-" + process.pid + ".json");
  const y = creeazaYahooExtra({ fisier: fis, pauzaMs: 0, f });
  const e = await y.extra("AAPL"); assert.ok(e && e.analisti, "a mers dupa refacerea crumb-ului"); assert.equal(crumbN, 2);
  assert.equal(await y.closes("COTIUSDT"), null); const n = cereri.length; assert.equal(await y.closes("COTIUSDT"), null); assert.equal(cereri.length, n, "a doua oara din cache");
  assert.equal(await y.extra("COTIUSDT"), null); const n2 = cereri.length; assert.equal(await y.extra("COTIUSDT"), null); assert.equal(cereri.length, n2, "insiderii: 404 tinut minte");
  try { fs.unlinkSync(fis); } catch {}
});

// ---------------- pachetul PAGINA + igiena ----------------
const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
function functia(src, nume) { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }

await test("🟡 pagina: nicio cerere fara timeout (60 s, cu mesaj pe romaneste); o valoare stricata in localStorage nu opreste pornirea", () => {
  assert.match(app, /signal:opt\.signal\|\|\(typeof AbortSignal!=="undefined"&&AbortSignal\.timeout\?AbortSignal\.timeout\(opt\.timeoutMs\|\|60000\)/);
  const jsonLS = new Function("localStorage", functia(app, "jsonLS") + "; return jsonLS;")({ getItem: () => "{stricat" });
  assert.deepEqual(jsonLS("favs", '["BTC"]'), ["BTC"]);
  assert.match(functia(app, "favs"), /jsonLS\(/);
});

await test("🟡 „Ce ai de făcut acum”: cele mai NOI sus si dupa consilier (un IESI vechi de 2 ore nu mai sta primul)", () => {
  const f = functia(app, "tbRenderTodo");
  assert.doesNotMatch(f, /l\.sort\(function\(a,c\)\{return RO\[a\.c\]-RO\[c\.c\]\}\)/);
  assert.match(f, /if\(x!==y\)return x===null\?1:y===null\?-1:y-x;return RO\[a\.c\]-RO\[c\.c\]/);
});

await test("🟡 Grid fara antetul vechi gol; navTo(id,true) deseneaza si ecranele din ramura fara load; citirea veche a Tabloului se anuleaza", () => {
  assert.match(app, /classList\.toggle\("peGrid",id==="gridset"\)/); assert.match(css, /body\.peGrid \.toolbar,body\.peGrid \.heroStrip,body\.peGrid \.tabs\{display:none\}/);
  assert.match(functia(app, "navTo"), /if\(!load\|\|!NAV_CU_LOAD\.has\(id\)\)\{/); assert.doesNotMatch(functia(app, "navTo"), /\} else \{/);
  const t = functia(app, "tbAduDate"); assert.match(t, /var gen=tbStare\.gen=\(tbStare\.gen\|\|0\)\+1;/); assert.equal((t.match(/if\(gen!==tbStare\.gen\)return;/g) || []).length, 3);   // v100.136: și la ratele de funding (a treia cerere)
});

await test("🔵 curatenie: trainTemporalModel (nechemata) scoasa; Ctrl+K are ecranele zilnice; „a” nu porneste analiza de pe ele; $ cu 2 zecimale de la $10", () => {
  assert.doesNotMatch(app, /function trainTemporalModel\(/); assert.match(app, /function trainTemporalModelAsync\(/);
  assert.match(app, /\["Tabloul botului","tabloubot"\],\["Grid: ce setez acum\?","gridset"\]/);
  assert.match(app, /e\.key\.toLowerCase\(\)==="a"&&!\/\\b\(peTablou\|peGrid/);
  const usd = new Function(functia(t212Ecran, "t212Usd") + "; return t212Usd;")();
  // v100.69 (pachetul 4): 2 zecimale de la $1 (nu de la $10): a treia nu se poate cota peste $1, iar „$4.900” langa „2.100 lei” se citea ca mii;
  // t212Usd cheama ActiuniSemnale.usd (aceeasi forma in pagina, Consilier si alerte)
  globalThis.ActiuniSemnale = globalThis.ActiuniSemnale || new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`).call(globalThis);
  assert.equal(usd(26.0871), "$26.09"); assert.equal(usd(5.123), "$5.12"); assert.equal(usd(250.5), "$250.50");
});

await test("🟡 copia KV si pe ALT disc (E:) - arhiva botilor nu mai sta doar pe C:", () => {
  const i = colector.indexOf("function turaCopie()"), f = colector.slice(i, i + 1400);
  assert.match(f, /COLECTOR_COPIE_E \|\| "E:\/crypto-radar-backup\/kv-copii"/); assert.match(f, /pastreaza: 30/);
});

await test("🟡 sfaturi pe bani: zero-ul pe minus = TAKE-PROFIT (nu stop); lichidarea DEPASITA = IESI; „ai ajuns pe zero” nu in prima ora", () => {
  const SF = new Function("GridCalcul", `${lib("sfaturi.js")}; return Sfaturi;`)(G);
  assert.match(lib("sfaturi.js"), /Aș pune take-profit-ul botului la " \+ pret\(z\.pretZero\) \+ " ca să ies fără pierdere \(nu stop:/); /* v100.62: la persoana I */
  assert.doesNotMatch(lib("sfaturi.js"), /take-profit \/ stop la/);
  const SB2 = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
  const s = SB2.semafor({ bot: { directie: "long", distantaLichidarePct: -20, lichidareDepasita: true }, fisa: { regim: { miscare: false } } });
  assert.equal(s.nivel, "iesi", "lichidarea depasita cu 20%: " + s.nivel + " " + s.motiv);
  const bot = (min) => ({ id: "9", baza: "CRV.PERP", directie: "long", pretCurent: 0.40, pornitLa: Date.now() - min * 60000, gridJos: 0.37, gridSus: 0.42 });
  assert.equal(AL.reguli(bot(5), { pretZero: 0.399 }, {})["p-zero"], undefined, "la 5 min dupa pornire: nimic");
  assert.equal(AL.reguli(bot(120), { pretZero: 0.399 }, {})["p-zero"].nivel, "atentie", "dupa o ora: da");
  void SF;
});

console.log(`\nV100.40 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
