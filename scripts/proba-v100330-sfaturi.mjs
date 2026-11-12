// Proba v100.330 · sfaturile botului (12.11.2026, el, pe HYPE short 3× pornit la 10:12, cu −0,10 USDT = comisioanele:
//   „Aș pune take-profit-ul botului la 71.2203 ca să ies fără pierdere … ni se pare o prostie, auditează partea asta de sugestii
//   să fie reale și cât mai corecte” ⇒ auditul ⇒ el: „da”):
//   1. sfatul „zero”: pe orice minus cerea un take-profit la zero (ÎN grid: botul s-ar fi închis la prima oscilație de 0,1%) și urca
//      în „Contează acum”. Acum zero-ul e FAPT (prețul, distanța, ce iei), iar „ieși la zero” + butonul vin doar cu un MOTIV de ieșire
//      (trend tare contra, fișa NU, mișcare mare contra botului, un pericol), botul are cel puțin o oră și pierderea e cel puțin 1% din bani;
//      atunci spune și câte grile nu mai lucrează. Doar acela intră în „Contează acum”.
//   2. avertismentul serverului „Comisioanele depășesc câștigul grilelor”: abia după o zi de viață și fără taxa de intrare (o dată).
//   3. liniștea: „tinde să țină” doar când a ținut în cel puțin jumătate din cazuri.
//   node scripts/proba-v100330-sfaturi.mjs
import "./lib/text-ro-global.mjs";   // garda din proba v10062: o probă care pomenește sfaturi.js încarcă întâi TextRo
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.330 · sfaturile botului: zero-ul, comisioanele, liniștea · proba\n");
const J = (x) => JSON.parse(JSON.stringify(x));

function modul(...fis) {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo };
  vm.createContext(ctx);
  vm.runInContext(fis.map((f) => citeste("public", "lib", f)).join("\n") + "\nthis.Sfaturi = typeof Sfaturi !== 'undefined' ? Sfaturi : null; this.Conteaza = typeof Conteaza !== 'undefined' ? Conteaza : null; this.TabloExtra = typeof TabloExtra !== 'undefined' ? TabloExtra : null;", ctx);
  return ctx;
}
const M = modul("sfaturi.js", "conteaza.js");

// botul lui de pe 12.11 (ruta, VPS): HYPE short 3×, grid 65–76, 20 de linii, prețul 71.32, 76,23 USDT, pornit 08:12 UTC, total −0,10
const ACUM = Date.parse("2026-11-12T08:26:00Z"), ORA = 3600000, ZI = 86400000;
const BOT = (o = {}) => Object.assign({ id: "hype", baza: "HYPE.PERP", directie: "short", levier: 3, activ: true, pretCurent: 71.32, investit: 76.23, profitTotal: -0.1,
  gridJos: 65, gridSus: 76, distantaLichidarePct: 39.1, pornitLa: Date.parse("2026-11-12T08:12:46Z"), opritorPierdereActiv: true, opritorPierdere: 77,
  opritorProfitActiv: false, opritorProfit: null, brut: { buOrderData: { row: 20, gridType: "arithmetic", initPrice: 71.3 } } }, o);
const ZERO = { pretZero: 71.2213, distantaZeroPct: -0.00138, iei: 76.1 };
const LATERAL = { directie: { dir: "neutru", tarie: "slab", motive: ["4 ore e laterală", "1 zi e laterală"] } };
const CONTRA = { directie: { dir: "long", tarie: "tare", motive: ["EMA20 peste EMA50 pe 4 h"] } };
const sfaturi = (b, fisa, zero = ZERO) => M.Sfaturi.sfaturi({ bot: b, scen: null, sanse: {}, rezumat: null, funding: null, fisa: fisa || null, costuri: null, zero, geom: null, ritm: null, acum: ACUM });
const zeroDin = (l) => l.filter((s) => s.cod === "zero")[0];
const VECHI = ACUM - 2 * ZI, MARE = -3.8;   // 2 zile de viață, −3,8 USDT = −5% din 76,23

// ───────────── 1. zero-ul ─────────────
await test("HYPE (botul lui, 14 minute, −0,10, piața laterală): zero-ul rămâne FAPT — fără „aș pune”, fără buton, fără „Contează acum”", () => {
  const l = sfaturi(BOT(), LATERAL), z = zeroDin(l);
  assert.ok(z, "faptul zero-ului lipsește");
  assert.equal(z.titlu, "Botul iese pe zero la 71.2213 (−0,1% de aici)");
  assert.match(z.text, /^Închis acum, ai lua 76,1 USDT din 76,23 investiți\./);   // revizia: rezultatul cu o zecimală, investiția la ban
  assert.ok(!z.faCe, "fără sfat de ieșire: " + z.faCe);
  assert.ok(!z.copiaza || !z.copiaza.length, "fără butonul de copiere");
  assert.ok(!z.iesire);
  assert.deepEqual(J(M.Conteaza.alege({ sfaturi: l })), [], "„Contează acum” nu-l mai urcă");
});
await test("motiv (trend tare contra), 2 zile, −5%: „Aș pune take-profit-ul la zero ca să ies fără pierdere: <motivul>” + câte grile nu mai lucrează + butonul + „Contează acum”", () => {
  const l = sfaturi(BOT({ pornitLa: VECHI, profitTotal: MARE }), CONTRA), z = zeroDin(l);
  assert.equal(z.iesire, true);
  assert.equal(z.faCe, "Aș pune take-profit-ul botului la 71.2213 ca să ies fără pierdere: trendul e împotriva botului (long, tare).");
  // short: take-profit-ul e SUB preț ⇒ grilele de sub el (65 … 71.2213) nu mai lucrează: (71.2213 − 65) / 11 × 19 = 10,7 ⇒ 11 din 19
  assert.match(z.text, /Sub 71\.2213 nu mai lucrează 11 din 19 grile\.$/);
  assert.deepEqual(J(z.copiaza), [{ ce: "take-profit", pret: "71.2213" }]);
  const ct = M.Conteaza.alege({ sfaturi: l }).filter((r) => r.cheie === "zero")[0];
  assert.ok(ct, "„Contează acum” îl ia când e sfat de ieșire");
  assert.deepEqual(J(ct.copiaza), [{ ce: "take-profit", pret: "71.2213" }]);
});
await test("long: take-profit-ul e PESTE preț ⇒ „Peste X nu mai lucrează N din M grile”", () => {
  const l = sfaturi(BOT({ directie: "long", pornitLa: VECHI, profitTotal: MARE, pretCurent: 70 }), { directie: { dir: "short", tarie: "tare", motive: [] } }, { pretZero: 72.2, distantaZeroPct: 0.0314, iei: 72.4 });
  const z = zeroDin(l);
  // long: (76 − 72.2) / 11 × 19 = 6,6 ⇒ 7 din 19
  assert.match(z.text, /Peste 72\.2000 nu mai lucrează 7 din 19 grile\.$/);
  assert.match(z.faCe, /: trendul e împotriva botului \(short, tare\)\.$/);
});
await test("motiv, dar botul are sub o oră: doar faptul (boții închiși în prima oră: −2.065 USDT în 2026)", () => {
  const z = zeroDin(sfaturi(BOT({ profitTotal: MARE, pornitLa: ACUM - 20 * 60000 }), CONTRA));
  assert.ok(!z.faCe && !z.iesire && !(z.copiaza && z.copiaza.length));
});
await test("motiv, botul vechi, dar pierderea e sub 1% din bani (−0,50 din 76,23): doar faptul", () => {
  const z = zeroDin(sfaturi(BOT({ pornitLa: VECHI, profitTotal: -0.5 }), CONTRA));
  assert.ok(!z.faCe && !z.iesire);
});
await test("fără motiv (piața laterală), botul vechi, −5%: doar faptul — gridul își face treaba", () => {
  const z = zeroDin(sfaturi(BOT({ pornitLa: VECHI, profitTotal: MARE }), LATERAL));
  assert.ok(!z.faCe && !z.iesire);
});
await test("celelalte motive: fișa zice NU · mișcare mare contra botului · un pericol (lichidarea aproape)", () => {
  const b = BOT({ pornitLa: VECHI, profitTotal: MARE });
  assert.match(zeroDin(sfaturi(b, { verdict: { nivel: "nu" } })).faCe, /: fișa monedei zice NU\.$/);
  assert.match(zeroDin(sfaturi(b, { regim: { miscare: true, sens: "urca", r4h: 2.1, r24h: 1.9 } })).faCe, /: piața e în mișcare mare contra botului\.$/);
  // mișcarea CU botul (short, piața coboară) nu e motiv de ieșire
  assert.ok(!zeroDin(sfaturi(b, { regim: { miscare: true, sens: "coboara", r4h: 2.1, r24h: 1.9 } })).faCe);
  const ctx = modul("sfaturi.js");
  ctx.Alerte = { reguli: () => ({ lich: { nivel: "atentie", titlu: "HYPE.PERP: lichidarea la 12,0%", mesaj: "Lichidarea la 12,0%.\n👉 N-aș mări poziția." } }) };
  const z = ctx.Sfaturi.sfaturi({ bot: b, scen: null, sanse: {}, rezumat: null, funding: null, fisa: null, costuri: null, zero: ZERO, geom: null, ritm: null, acum: ACUM }).filter((s) => s.cod === "zero")[0];
  assert.match(z.faCe, /: lichidarea e aproape\.$/);
});
await test("intrare() dă și `acum` sfaturilor (vârsta botului în colector și în Tablou)", () => {
  const S = citeste("public", "lib", "sfaturi.js");
  assert.match(S, /return \{ bot: b, scen: scen,[\s\S]{0,900}?, acum: acum \};/);
});

// ───────────── 2. comisioanele (serverul) ─────────────
const { avertismenteBot, taxaIntrareServer } = await import("../functions/_shared/avertismente.js");
const AV = (o) => avertismenteBot(Object.assign({ x: { profitStop: 1, lossStop: 1, initPrice: 71.3 }, pret: 71.32, jos: 65, sus: 76, lich: { distantaLichidarePct: 39 },
  investit: 76.23, levier: 3, directie: "short", acum: ACUM }, o));
await test("HYPE la 14 minute: „Comisioanele (−0,06) depășesc câștigul grilelor (0,0)” NU mai pleacă (taxa de intrare, o dată)", () => {
  const a = AV({ comisioane: -0.06, gridProfitBrut: 0, profitNet: -0.06, pornitLa: ACUM - 14 * 60000 });
  assert.ok(!a.some((t) => /Comisioanele/.test(t)), a.join(" | "));
});
await test("după o zi: comisioanele se judecă FĂRĂ taxa de intrare (spusă alături); când doar taxa le întrecea, tace", () => {
  const a = AV({ comisioane: -0.5, gridProfitBrut: 0.3, profitNet: -0.2, pornitLa: VECHI });
  // taxa: 76,23 × 3 × (71,3 − 65) / 11 × 0,0005 = 0,0655 ⇒ comisioanele grilelor −0,4345 ⇒ „−0,4” (rezultatele cu o zecimală, regula lui din 03.10)
  assert.ok(a.includes("Comisioanele (−0,4 USDT, fără taxa de intrare de −0,07) depășesc câștigul grilelor (+0,3 USDT)."), a.join(" | "));
  const b = AV({ comisioane: -0.08, gridProfitBrut: 0.03, profitNet: -0.05, pornitLa: VECHI });
  assert.ok(!b.some((t) => /Comisioanele \(/.test(t)), "−0,08 = taxa 0,0655 + 0,0145 din grile < 0,03: " + b.join(" | "));
});
await test("revizia: botul de 14 minute cu o grilă umplută (+0,02) nu primește nici „Grilele … botul e pe minus” (aceeași alarmă, altfel spusă)", () => {
  const a = AV({ comisioane: -0.06, gridProfitBrut: 0.02, profitNet: -0.04, pornitLa: ACUM - 14 * 60000 });
  assert.ok(!a.some((t) => /Comisioanele|botul e pe minus/.test(t)), a.join(" | "));
  const b = AV({ comisioane: -0.06, gridProfitBrut: 0.02, profitNet: -0.04, pornitLa: VECHI });
  assert.ok(b.some((t) => /Comisioanele|botul e pe minus/.test(t)), "după o zi spune: " + b.join(" | "));
});
await test("taxa de intrare a serverului = cea din Tablou (TabloExtra, prin grileVsCosturi) pe același bot", () => {
  const T = modul("grid-calcul.js", "tablou-extra.js").TabloExtra;
  const b = BOT({ comisioane: -0.5, finantare: 0, brut: { buOrderData: { row: 20, initPrice: 71.3, gridProfit24h: 0.1 } } });
  const tTablou = T.grileVsCosturi(b, ACUM + ZI).taxaIntrare, tServer = taxaIntrareServer({ x: { initPrice: 71.3 }, directie: "short", investit: 76.23, levier: 3, jos: 65, sus: 76, comisioane: -0.5 });
  assert.ok(Math.abs(tTablou - tServer) < 1e-12, tTablou + " vs " + tServer);
});
await test("ruta bot-orders dă avertismentelor vârsta, investiția, levierul și direcția", () => {
  const R = citeste("functions", "api", "bot-orders.js");
  assert.match(R, /avertismenteBot\(\{x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet,pornitLa:nr\(bot\.createTime\),acum:Date\.now\(\),investit,levier:nr\(x\.leverage\),directie:dir\}\)/);
});
await test("fără vârstă și fără investiție (probele vechi): aceeași frază ca înainte", () => {
  const a = avertismenteBot({ x: { profitStop: 1, lossStop: 1 }, pret: 1, jos: 0.5, sus: 2, lich: { distantaLichidarePct: null }, comisioane: -0.0412, gridProfitBrut: 0.031, profitNet: -0.2 });
  assert.ok(a.includes("Comisioanele (−0,04 USDT) depășesc câștigul grilelor (+0,03 USDT)."), a.join(" | "));
});

// ───────────── 2b. alerta „botul a ajuns pe zero” (el, 12.11: „fa tot acum”; HYPE: plecase la 11:13, la 1 h 1 min, cu −0,10 = comisioanele) ─────────────
const A = modul("alerte.js").Alerte || (() => { const c = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo }; vm.createContext(c); vm.runInContext(citeste("public", "lib", "alerte.js") + "\nthis.Alerte = Alerte;", c); return c.Alerte; })();
const HYPE_ZERO = (o = {}) => BOT(Object.assign({ pornitLa: ACUM - 2 * ORA, pretCurent: 71.107 }, o));   // short: prețul a coborât pe zero-ul 71.2203
await test("alerta p-zero: fără o pierdere de cel puțin 1% înainte (subZero), prețul pe zero NU mai pleacă", () => {
  const r = A.reguli(HYPE_ZERO(), { pretZero: 71.2203 }, {});
  assert.ok(!r["p-zero"] || r["p-zero"].nivel === "ok", JSON.stringify(r["p-zero"]));
});
await test("alerta p-zero: după o pierdere de cel puțin 1% (ctx.subZero) pleacă ca înainte; odată pornită, histerezisul o ține și fără subZero", () => {
  const r = A.reguli(HYPE_ZERO(), { pretZero: 71.2203, subZero: true }, {});
  assert.equal(r["p-zero"].nivel, "atentie"); assert.match(r["p-zero"].titlu, /botul a ajuns pe zero \(71\.2203\)/);
  const r2 = A.reguli(HYPE_ZERO(), { pretZero: 71.2203 }, { "p-zero": { nivel: "atentie" } });
  assert.equal(r2["p-zero"].nivel, "atentie", "deja în alertă: rămâne până iese din bandă");
});
await test("colectorul: ține `_subZero` (totalul ≤ −1% din investiție), îl dă alertelor ca ctx.subZero și îl uită după ce alerta a plecat", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /if \(tot0 !== null && inv0 > 0 && tot0 <= -0\.01 \* inv0\) inainte\._subZero = true;/);
  assert.match(C, /ctx\.subZero = inainte\._subZero === true;/);
  // revizia Opus (🔵3): uitat abia când alerta s-a încheiat (atentie ⇒ ok); o trimitere picată repune starea veche și _subZero rămâne ⇒ reîncercarea are loc
  assert.match(C, /if \(inaintePz === "atentie" && r\.stare\["p-zero"\] && r\.stare\["p-zero"\]\.nivel === "ok"\) delete stareAlerte\[b\.id\]\._subZero;/);
  assert.doesNotMatch(C, /nivel === "atentie"\) delete stareAlerte\[b\.id\]\._subZero/);
});

// ───────────── 3. liniștea ─────────────
const LIN = (p) => ({ liniste: { linisteAcum: true, suficient: true, p, H: 2, k: Math.round(p * 40), n: 40, zileLiniste: 3, ic: [p - 0.1, p + 0.1] } });
const lin = (p) => sfaturi(BOT({ pornitLa: VECHI, profitTotal: 1 }), LIN(p)).filter((s) => s.cod === "liniste")[0];
await test("liniștea care a ținut în 40% din cazuri NU „tinde să țină”; de la 50% da; sub 35% ca înainte", () => {
  const a = lin(0.4);
  assert.doesNotMatch(a.faCe, /tinde să țină/);
  assert.equal(a.ton, "bine", "revizia: tonul vechi, ca să nu intre ca rând nou în lista de făcut");
  assert.equal(a.faCe, "L-aș lăsa să lucreze, fără bani în plus: liniștea a ținut aici în mai puțin de jumătate din cazuri.");
  const b = lin(0.6);
  assert.equal(b.faCe, "L-aș lăsa să lucreze: liniștea tinde să țină aici."); assert.equal(b.ton, "bine");
  assert.match(lin(0.3).faCe, /^N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare\.$/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
