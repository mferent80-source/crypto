// Proba v100.339-c (auditul Tabloului botului din 13.11, valul C: detaliile botului). Botul de probă trece prin normalizarea adevărată a
// serverului (scripts/lib/bot-de-proba.mjs), iar textele vin din modulele paginii.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { botDeProba, botBrut, stareGrid, GRID } from "./lib/bot-de-proba.mjs";
import { taie } from "./lib/motor-pagina.mjs";
import { normalizeaza } from "../functions/api/bot-orders.js";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
for (const f of ["grid-calcul.js", "scenariu.js", "tablou-extra.js", "alerte.js", "semnale-bot.js", "sfaturi.js", "conteaza.js", "consiliu.js", "tablou-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, TE = G.TabloExtra, SB = G.SemnaleBot, Sfaturi = G.Sfaturi, Consiliu = G.Consiliu, Alerte = G.Alerte, Conteaza = G.Conteaza;
const ACUM = Date.UTC(2026, 10, 13, 12), ORA = 3600000, APP = citeste("public", "app.js");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.339-c · auditul Tabloului: detaliile botului · proba\n");
const FISA_CU = (dir) => ({ regim: { miscare: false, r4h: 0.8, r24h: 0.9 }, directie: { dir, tarie: "mediu", motive: ["EMA20 " + (dir === "short" ? "sub" : "peste") + " EMA50"] }, verdict: { nivel: "da", motive: [] }, setare: null });
// tot ce vede omul: alertele, sfaturile, cartelele, Consilierul, „Ce ai de făcut”, „Contează acum”
function ecran(b, o) {
  o = o || {}; const z = TE.dacaInchizi(b), cost = TE.grileVsCosturi(b, ACUM), fisa = o.fisa || null, al = Alerte.reguli(b, null);
  const sf = Sfaturi.sfaturi(Sfaturi.intrare({ bot: b, fisa, acum: ACUM }));
  const sm = SB.semafor({ bot: b, fisa, zero: z, plan: null, costuri: cost, muta: SB.mutaGridul(b, fisa, 0, null), iaProfit: SB.iaProfit(b, fisa) });
  const conc = SB.acumConcret({ bot: b, fisa, zero: z, costuri: cost, plan: null, acum: ACUM, pragStop: o.pragStop || null, cifre: (pr) => TE.cifreActiuni(b, { protectie: pr }) });
  const cons = Consiliu.alcatuieste({ sm, concret: conc, sfaturi: sf, laJos: TE.totalCuGridLa(b, b.gridJos), jos: b.gridJos, laSus: TE.totalCuGridLa(b, b.gridSus), sus: b.gridSus, opritor: SB.pretStopEcran(b), opritorProc: SB.etichetaStopProc(b) });
  const todo = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, sfaturi: sf, avertismente: b.avertismente, alerte: [], planGol: true });
  const ct = Conteaza.alege({ stop: null, sfaturi: sf, lista: todo, sanse: [], acum: ACUM });
  return { z, cost, al, sf, sm, conc, cons, todo, ct, st: conc.filter((c) => c.cod === "stop")[0] };
}

// ---------------- (C1) „prețul a ieșit din grid”: partea câștigului nu e partea pierderii ----------------
await test("(C1a) short cu prețul SUB grid (partea câștigului): botul a încasat și stă ⇒ informație, nu pericol; o singură acțiune, „aș încasa…”", () => {
  const b = botDeProba("short", 65, 64), e = ecran(b, { fisa: FISA_CU("short") }); assert.ok(b.profitTotal > 0, "premisa: pe plus " + b.profitTotal); assert.ok(Math.abs(b.pozitie) < 1e-6, "premisa: fără poziție");
  assert.equal(e.al.grid.peCastig, true); assert.match(e.al.grid.mesaj, /a încasat/); assert.match(e.al.grid.mesaj, /👉 Aș încasa/); assert.doesNotMatch(e.al.grid.mesaj, /Aș aștepta o zi/);
  const s = e.sf.find((x) => x.cod === "pericol" && x.tip === "grid"); assert.equal(s.ton, "info"); assert.match(s.faCe, /^Aș încasa/);
  assert.ok(!e.ct.some((c) => c.cheie === "pericol"), "ieșirea pe câștig nu urcă în „Contează acum”: " + JSON.stringify(e.ct.map((c) => c.cheie + ":" + c.titlu)));
  const lucreaza = e.sf.filter((x) => /L-aș lăsa să lucreze/.test(x.faCe || "")); assert.deepEqual(lucreaza.map((x) => x.cod), [], "botul nu lucrează: nimeni nu zice „L-aș lăsa să lucreze”");
});
await test("(C1b) short cu prețul PESTE grid (partea pierderii): pericol, cu totalul de acum în fraza faptului; acțiunea rămâne „aș aștepta o zi…”", () => {
  const b = botDeProba("short", 76, 77.5), e = ecran(b); assert.ok(b.profitTotal < -10);
  assert.equal(e.al.grid.peCastig, false); assert.match(e.al.grid.mesaj, /total −16,[0-9] USDT/); assert.match(e.al.grid.mesaj, /👉 Aș aștepta o zi/);
  const s = e.sf.find((x) => x.cod === "pericol" && x.tip === "grid"); assert.equal(s.ton, "atentie"); assert.ok(e.ct.some((c) => c.cheie === "pericol"));
});
await test("(C1c) oglinda la long: peste grid = câștig („a încasat”), sub grid = pierdere", () => {
  assert.equal(Alerte.reguli(botDeProba("long", 76, 77), null).grid.peCastig, true); assert.equal(Alerte.reguli(botDeProba("long", 65, 63.5), null).grid.peCastig, false);
  assert.match(Alerte.reguli(botDeProba("long", 76, 77), null).grid.titlu, /a ieșit din grid pe sus/); assert.equal(Alerte.reguli(botDeProba("short", 70, 70), null).grid.nivel, "ok");
});

// ---------------- (C2) „Mută gridul” spune cât fixează închiderea ----------------
const FISA_MUTA = { dir: "short", propusa: "rara", treceriZi: 6.2, regim: { miscare: false, r4h: 0.9, r24h: 1.0 }, directie: { dir: "lateral", tarie: "slab", motive: [] }, verdict: { nivel: "da", motive: [] },
  setare: { dir: "short", jos: 70.5, sus: 80, grile: 19, levier: 3, levierSigur: 3, pas: 0.0067, profitGrila: 0.0063, stop: { jos: 70, sus: 80.6 } } };
await test("(C2) la marginea de pierdere, pe minus: „Aș muta gridul” spune și cât fixează închiderea de acum", () => {
  const b = botDeProba("short", 75, 75.3, { pornitLa: ACUM - 30 * ORA, x: { lossStop: "80", lossStopType: "price" } }), e = ecran(b, { fisa: FISA_MUTA });
  assert.ok(b.profitTotal < -5, "premisa: pe minus " + b.profitTotal); const m = SB.mutaGridul(b, FISA_MUTA, 0, null); assert.ok(m && !m.asteapta, "premisa: gridul e de mutat");
  const tot = [e.sm.faCe, e.cons.faCe].join(" ¦ "); assert.match(tot, /Aș muta gridul: închid botul \(închis acum: −\d+,\d USDT\) și pornesc cu setările din cartela Gridul\./, tot);
});

await test("(C1d) banda de 1% de la revenire: prețul e ÎN interval, lângă margine ⇒ nu „e sub interval”, nu „nu mai are poziție”, nu „Aș încasa” lângă „L-aș lăsa să lucreze”", () => {
  const inainte = { grid: { nivel: "atentie" } };
  const sh = Alerte.reguli(botDeProba("short", 65.5, 65.05), null, inainte).grid; assert.equal(sh.nivel, "atentie", "alerta încă ține (histerezis)");
  assert.match(sh.mesaj, /e la marginea de jos a intervalului \(65[,.]0* ?– ?76/); assert.doesNotMatch(sh.mesaj, /e sub interval|nu mai are poziție|Aș încasa/); assert.match(sh.titlu, /la marginea de jos a gridului/);
  const lg = Alerte.reguli(botDeProba("long", 75.5, 75.95), null, inainte).grid; assert.equal(lg.nivel, "atentie"); assert.match(lg.mesaj, /e la marginea de sus a intervalului/); assert.doesNotMatch(lg.mesaj, /e peste interval|Aș încasa/);
  // afară de-adevăratelea: ca înainte
  const afara = Alerte.reguli(botDeProba("short", 65, 64.5), null, inainte).grid; assert.match(afara.mesaj, /e sub interval/); assert.match(afara.mesaj, /👉 Aș încasa/); assert.match(afara.titlu, /a ieșit din grid pe jos/);
  // fără alertă înainte, prețul lângă margine dar înăuntru nu aprinde nimic
  assert.equal(Alerte.reguli(botDeProba("short", 65.5, 65.05), null, {}).grid.nivel, "ok");
});
// ---------------- (C3) grilele și comisionul pe aceeași fereastră ----------------
await test("(C3b) „tranzacțiile pe 24 h” ale Pionex sunt PERECHI (botul viu, 14.11: trx24h ÷ perechile socotite din grile = 0,99): sfatul de ritm le compară cu perechile pe zi, nu cu ordinele închise; cartela gridului zice „perechi”", () => {
  const b = botDeProba("short", 71, 71, { pornitLa: ACUM - 2 * 24 * ORA, x: { exchangeOrderPairedCount: "100", closedExchangeOrderCount: "205", trx24h: "50", gridProfit: "7", gridProfit24h: "3.5" } });
  const it = Sfaturi.intrare({ bot: b, fisa: null, acum: ACUM }); assert.equal(it.ritm.tranz24h, 50); assert.ok(Math.abs(it.ritm.tranzMedieZi - 50) < 1e-9, "perechi pe zi: " + it.ritm.tranzMedieZi);
  assert.equal(Sfaturi.intrare({ bot: Object.assign({}, b, { ordinePerechi: null }), fisa: null, acum: ACUM }).ritm.tranzMedieZi, null, "fără numărul de perechi: nicio comparație");
  const e = ecran(b), gr = JSON.stringify(e.conc); assert.doesNotMatch(gr, /umpler[ei] în 24 h/); assert.match(gr, /50 de perechi în 24 h/);
});
await test("(C3) bot de 6 zile, activ la început și liniștit acum (o pereche în 24 h din 121): comisionul ZILEI, nu media de la pornire ⇒ nu „costurile mănâncă grilele”", () => {
  const fee = -(12 * GRID.lot * 71 * 0.0005) - 121 * 2 * 0.0002 * GRID.lot * 71;
  const b = botDeProba("short", 71, 71, { stare: { q: 12 * GRID.lot, pd: 71, real: 121 * 0.07, fee, grid: 121 * 0.07, perechi: 121 }, g24: 0.07, pornitLa: ACUM - 6 * 24 * ORA, x: { trx24h: "1" } });
  const c = TE.grileVsCosturi(b, ACUM), real = -2 * 0.0002 * GRID.lot * 71;
  assert.ok(Math.abs(c.comisionZi - real) < 0.002, "comisionul zilei " + c.comisionZi + " față de cel real " + real); assert.equal(c.fereastra, "24h"); assert.ok(c.netZi > 0, "netZi " + c.netZi);
  assert.ok(Math.abs(c.comisionMedieZi) > 5 * Math.abs(c.comisionZi), "premisa: media de la pornire e mult mai mare: " + c.comisionMedieZi);
  const e = ecran(b); assert.ok(!e.sf.some((s) => s.cod === "costuri" && (s.ton === "atentie" || s.ton === "critic")), JSON.stringify(e.sf.filter((s) => s.cod === "costuri")));
  // control: fără numărul de perechi de la pornire rămâne media, spusă ca medie
  const fara = TE.grileVsCosturi(Object.assign({}, b, { ordinePerechi: null }), ACUM); assert.equal(fara.fereastra, "medie"); assert.equal(fara.comisionZi, fara.comisionMedieZi);
});

// ---------------- (C8) „pierderea maximă” fără stop ----------------
await test("(C8) fără stop, pe marjă izolată: pierderea maximă e toată marja, la lichidare (nu „fără margine”); stopul de alături e „propus”, nu „al planului”", () => {
  const b = botDeProba("short", 73, 73), e = ecran(b); assert.equal(b.opritorPierdereActiv, false); assert.ok(b.pretLichidare > 90);
  assert.match(e.st.bani, /Pierderea maximă: −76,0 USDT fără stop \(toată marja, la lichidarea 95[.,]2\)/, e.st.bani); assert.doesNotMatch(String(e.st.bani) + String(e.cons.bani), /fără margine/);
  assert.doesNotMatch(String(e.cons.bani), /stopul planului/); assert.match(String(e.cons.bani), /cu stopul propus/);
});

// ---------------- „Cele șapte măsuri” ----------------
const TB = G.TabloBot, MIN = 60000;
// mostrele colectorului: una pe minut, 8 ore; perechile cresc cu `peOra` până acum o oră, apoi `inUltimaOra` în ultima oră
const istoricRitm = (peOra, inUltimaOra) => Array.from({ length: 8 * 60 + 1 }, (_, i) => { const t = ACUM - (8 * 60 - i) * MIN, oreInainte = Math.min(7, i / 60), dupa = Math.max(0, i / 60 - 7); return { t, perechi: Math.floor(100 + oreInainte * peOra + dupa * inUltimaOra) }; });
const lum5 = (n, pas) => Array.from({ length: n }, (_, i) => { const c = 71 + (i % 2 ? pas : 0); return { time: ACUM - (n - i) * 5 * MIN, open: c, high: c + 0.05, low: c - 0.05, close: c, volume: 10 }; });
await test("(D2a) ritmul perechilor: o oră fără perechi la ~2 pe oră e zgomot obișnuit (nu „rău”); la ~6 pe oră e o cădere adevărată; rândul spune ce compară", () => {
  const m2 = TB.masoara({ bot: botBrut("short", 71, { acum: ACUM }), klinePerp: lum5(100, 0.3), istoric: istoricRitm(2, 0), acum: ACUM, pretPerpViu: 71 });
  assert.equal(m2.ritmPerechi.valoare, 0); assert.equal(m2.ritmPerechi.stare, "bine", "0 perechi într-o oră la 2 pe oră: șansă ~1 din 7"); assert.match(m2.ritmPerechi.eticheta, /ultima oră: 0 perechi · înainte ~2,0 pe oră/);
  const m6 = TB.masoara({ bot: botBrut("short", 71, { acum: ACUM }), klinePerp: lum5(100, 0.3), istoric: istoricRitm(6, 0), acum: ACUM, pretPerpViu: 71 });
  assert.equal(m6.ritmPerechi.stare, "rau");
});
await test("(D2b) „drumul prețului, în trepte” e un fapt (cât a mers prețul față de treapta gridului), fără culoare; pagina îl arată în locul „amplitudinii”", () => {
  const m = TB.masoara({ bot: botBrut("short", 71, { acum: ACUM }), klinePerp: lum5(100, 0.3), istoric: [], acum: ACUM, pretPerpViu: 71 });
  // 99 de pași de 0,3 = 29,7; treapta = (76 − 65) / 22 = 0,5 ⇒ 59,4 trepte în 8,25 h ⇒ 7,2 pe oră
  assert.ok(Math.abs(m.trepte.valoare - 59.4 / 8.25) < 0.01, String(m.trepte.valoare)); assert.equal(m.trepte.stare, "info"); assert.equal(m.trepte.unitate, "trepte/oră"); assert.match(m.trepte.eticheta, /^59 de trepte în ultimele 8,3 h$/);
  assert.ok(APP.includes('["drumul prețului, în trepte",tbRandTrepte(m)]') && !APP.includes('["amplitudine vs treaptă",m.amplitudine]'), "rândul din „Cele șapte măsuri”");
  // nimic pierdut: cifra amplitudinii (ATR față de treaptă) și percentila ei rămân pe rând, ca fapt - fără starea ei „rău”
  const cT = { TextRo: globalThis.TextRo, isFinite }; vm.createContext(cT); vm.runInContext(taie(APP, "tbRandTrepte"), cT);
  const rT = cT.tbRandTrepte({ trepte: { valoare: 7.2, unitate: "trepte/oră", stare: "info", eticheta: "59 de trepte în ultimele 8,3 h" }, amplitudine: { valoare: 0.84, stare: "rau", eticheta: "ATR la percentila 12 a monedei" } });
  assert.equal(rT.eticheta, "59 de trepte în ultimele 8,3 h · amplitudinea (ATR) 0,84× treapta · ATR la percentila 12 a monedei"); assert.equal(rT.stare, "info"); assert.equal(rT.valoare, 7.2); assert.equal(rT.unitate, "trepte/oră");
  assert.equal(cT.tbRandTrepte({ trepte: { valoare: null, stare: "nu-se-poate" }, amplitudine: { valoare: 1.42, eticheta: null } }).eticheta, "amplitudinea (ATR) 1,4× treapta", "fără drum, amplitudinea tot se vede");
  const fara = { valoare: 3, stare: "info", eticheta: "x" }; assert.equal(cT.tbRandTrepte({ trepte: fara, amplitudine: { valoare: null } }), fara, "fără amplitudine: rândul neschimbat"); assert.equal(cT.tbRandTrepte({}), undefined); assert.equal(cT.tbRandTrepte(null), undefined);
});
await test("(C4) „comision vs grid”: taxa de intrare (plătită o dată) nu se numără - botul de 20 de minute nu mai e „88% rău”; comisionul grilelor peste jumătate din grid rămâne rău", () => {
  const m = (x, o) => TB.masoara({ bot: botBrut("short", 71, Object.assign({ acum: ACUM, pornitLa: ACUM - 20 * MIN, x }, o)), klinePerp: lum5(100, 0.3), istoric: [], acum: ACUM, pretPerpViu: 71 });
  const tanar = m({ gridProfit: "0.07", totalFee: "-0.0616" });   // taxa de intrare ≈ 76 × 3 × 6/11 × 0,05% = 0,062
  assert.equal(tanar.comision.stare, "bine"); assert.ok(tanar.comision.valoare < 5, String(tanar.comision.valoare)); assert.match(tanar.comision.eticheta, /^fără taxa de intrare \(≈ 0,06 USDT\)$/);
  assert.equal(m({ gridProfit: "0.07", totalFee: "-0.12" }).comision.stare, "rau", "0,058 din 0,07 = 82%");
  assert.equal(m({ gridProfit: "0", totalFee: "-0.06" }).comision.stare, "nu-se-poate", "doar taxa de intrare, nicio grilă: nu e nimic de judecat");
  assert.equal(m({ gridProfit: "0", totalFee: "-0.30" }).comision.stare, "rau", "taxe care curg fără profit brut rămân rău");
  // revizia independentă (🔴): neutrul nu deschide poziție la pornire ⇒ nicio taxă de intrare de scăzut (ca TabloExtra.taxaIntrare); la fel botul fără direcție
  for (const tr of ["neutral", ""]) { const n = m({ gridProfit: "0.07", totalFee: "-0.0616", trend: tr }).comision; assert.equal(n.stare, "rau", "trend „" + tr + "”: " + JSON.stringify(n)); assert.ok(Math.abs(n.valoare - 88) < 0.1, String(n.valoare)); assert.ok(!n.eticheta, String(n.eticheta)); }
  // oglinda la long: partea de grid de PESTE prețul de pornire (5 / 11 din interval)
  const lg = TB.masoara({ bot: botBrut("long", 71, { acum: ACUM, pornitLa: ACUM - 20 * MIN, x: { gridProfit: "0.07", totalFee: "-0.0518" } }), klinePerp: lum5(100, 0.3), istoric: [], acum: ACUM, pretPerpViu: 71 }).comision;
  assert.equal(lg.stare, "bine", JSON.stringify(lg)); assert.match(lg.eticheta, /^fără taxa de intrare \(≈ 0,05 USDT\)$/);
  // o singură zecimală de la 0,1 USDT în sus (regula casei); sub 0,1 rămân două
  assert.match(m({ gridProfit: "0.7", totalFee: "-0.63" }, { grid: Object.assign({}, GRID, { bani: 760 }) }).comision.eticheta, /^fără taxa de intrare \(≈ 0,6 USDT\)$/);
});

// ---------------- (C5) sumele mici și poziția ----------------
const dinApp = (nume, ctx) => { const src = nume.map((n) => { const s = taie(APP, n); assert.ok(s, n + " lipsește din app.js"); return s; }).join("\n"); const c = Object.assign({ TextRo: G.TextRo, TabloExtra: TE, Math, Number, String, isFinite, Object, Array }, ctx || {}); vm.createContext(c); vm.runInContext(src, c); return c; };
await test("(C5) o sumă sub 0,1 USDT își arată zecimalele (−0,0377 nu e „0,0”); poziția are cifre semnificative („2,24”, nu „~2”)", () => {
  const c = dinApp(["botiNr", "botiBan"]);
  assert.equal(c.botiBan(-0.0377), "−0,04 USDT"); assert.equal(c.botiBan(-0.0098), "−0,01 USDT"); assert.equal(c.botiBan(-0.004), "−0,004 USDT"); assert.equal(c.botiBan(0.03), "+0,03 USDT"); assert.equal(c.botiBan(-0.0636), "−0,06 USDT");
  assert.equal(c.botiBan(-3.168), "−3,2 USDT"); assert.equal(c.botiBan(0), "0,0 USDT"); assert.equal(c.botiBan(12.345, 2), "+12,35 USDT", "zecimalele cerute anume rămân");
  assert.equal(G.TextRo.cant(2.24), "2,24"); assert.equal(G.TextRo.cant(3.08), "3,08"); assert.equal(G.TextRo.cant(0.0021), "0,0021"); assert.equal(G.TextRo.cant(160), "160"); assert.equal(G.TextRo.cant(12.5), "12,5"); assert.equal(G.TextRo.cant(0), "0"); assert.equal(G.TextRo.cant(-2.24), "−2,24");
  assert.ok(/TextRo\.cant\(x\.pozitie\)/.test(APP) && !/'<span>'\+Math\.round\(x\.pozitie\)\+'<\/span>'/.test(APP), "coloana „Poziția” din „Dacă prețul ajunge la…”");
  const SF = citeste("public", "lib", "sfaturi.js"); assert.ok(!/Math\.round\(la(Sus|Jos)\.pozitie\)/.test(SF) && /TextRo\.cant\(laSus\.pozitie\)/.test(SF), "sfatul de margine");
});

// ---------------- (C11) „Dacă prețul ajunge la…” ----------------
await test("(C11) țintele sunt oglindite la short (−5%, +5%, +10%: două pe partea pierderii); peste prețul de lichidare al Pionex rândul e „lichidat”", () => {
  const c = dinApp(["botiNr", "tbTinteScenariu", "tbScenLichidat"], { tbStare: { scenariuPropriu: null } });
  const et = (b) => Array.from(c.tbTinteScenariu(b)).map((t) => t.eticheta).filter((e) => /^[+−]/.test(e)).join(" ");
  assert.equal(et({ directie: "short", pretCurent: 72, gridJos: 70, gridSus: 74 }), "−5% +5% +10%"); assert.equal(et({ directie: "long", pretCurent: 72, gridJos: 70, gridSus: 74 }), "+5% −5% −10%");
  const sh = { directie: "short", pretLichidare: 95.2 };
  assert.equal(c.tbScenLichidat({ pret: 96, gol: false }, sh), true); assert.equal(c.tbScenLichidat({ pret: 94, gol: false }, sh), false); assert.equal(c.tbScenLichidat({ pret: 94, gol: true }, sh), true);
  assert.equal(c.tbScenLichidat({ pret: 40, gol: false }, { directie: "long", pretLichidare: 48.1 }), true); assert.equal(c.tbScenLichidat({ pret: 96, gol: false }, { directie: "short", pretLichidare: null }), false);
});

// ---------------- (C12) sub o zi de viață nimic nu se înmulțește „pe zi” ----------------
await test("(C12) bot de 5 ore: comisionul și funding-ul nu apar „pe zi”, ci „de la pornire”; de la o zi apar pe zi, cu fereastra spusă", () => {
  const c = dinApp(["botiNr", "botiBan", "tbCosturiZi"]);
  const tanar = c.tbCosturiZi({ zile: 5 / 24, comisionZi: -0.4, fundingZi: 0.144, taxaIntrare: -0.06, fereastra: "medie", fundingMananca: false }, { comisioane: -0.14, finantare: 0.03 });
  assert.equal(tanar.comision.val, "—"); assert.match(tanar.comision.nota, /sub o zi: de la pornire −0,08 USDT/); assert.equal(tanar.funding.val, "—"); assert.match(tanar.funding.nota, /sub o zi: de la pornire \+0,03 USDT/);
  const vechi = c.tbCosturiZi({ zile: 6, comisionZi: -0.004, fundingZi: 0.05, taxaIntrare: -0.06, fereastra: "24h", fundingMananca: false }, { comisioane: -0.5, finantare: 0.3 });
  assert.equal(vechi.comision.val, "−0,004 USDT"); assert.match(vechi.comision.nota, /pe perechile ultimelor 24 h, fără taxa de intrare/); assert.equal(vechi.funding.val, "+0,05 USDT"); assert.match(vechi.funding.nota, /medie de la pornire/);
});

// ---------------- (C9) rândul „Funding” din citire ----------------
await test("(C9) rândul „Funding”: culoarea după media pe 7 zile (ca cifra de sus și sfatul), nu după ultima rată; când se contrazic, o spune", () => {
  const GB = new Function(citeste("public", "lib", "grafic-bot.js") + "; return GraficBot;")();
  const B = Array.from({ length: 80 }, (_, i) => { const p = 100 + 0.2 * Math.sin(i / 2); return { t: i * 900000, o: p, h: p + 0.15, l: p - 0.15, c: p, v: 10 }; });
  const rand = (funding) => GB.citire(GB.intrareBot({ bot: { id: "x", directie: "short" }, bare: B, W: 900, TabloExtra: null, funding }), { directie: "short" }, 100).randuri.find((x) => x.ce === "Funding");
  const contra = rand({ rata: 0.0001, medieZi: -0.0006, acum: ACUM }); assert.equal(contra.stare, "atentie", "short: ultima rată îl plătește, dar media pe 7 zile îl costă"); assert.match(contra.text, /pe 7 zile, în medie, botul plătește/);
  const la_fel = rand({ rata: 0.0001, medieZi: 0.0004, acum: ACUM }); assert.equal(la_fel.stare, "bine"); assert.doesNotMatch(la_fel.text, /pe 7 zile, în medie/);
  assert.equal(rand({ rata: 0.0001, acum: ACUM }).stare, "bine", "fără medie: ca înainte, după ultima rată");
  assert.match(taie(APP, "tbFundingPt"), /medieZi:/, "pagina dă citirii și media pe 7 zile");
});
await test("(C9b) rândul „Funding” în oglindă la long și la botul NEUTRU (acolo plătește partea pe care e poziția de acum; fără poziție nu e nici „bine”, nici „încasează”)", () => {
  const GB = new Function(citeste("public", "lib", "grafic-bot.js") + "; return GraficBot;")();
  const B = Array.from({ length: 80 }, (_, i) => { const p = 100 + 0.2 * Math.sin(i / 2); return { t: i * 900000, o: p, h: p + 0.15, l: p - 0.15, c: p, v: 10 }; });
  const rand = (bot, funding) => GB.citire(GB.intrareBot({ bot: Object.assign({ id: "x" }, bot), bare: B, W: 900, TabloExtra: null, funding }), bot, 100).randuri.find((x) => x.ce === "Funding");
  const lgContra = rand({ directie: "long" }, { rata: -0.0001, medieZi: 0.0006, acum: ACUM }); assert.equal(lgContra.stare, "atentie"); assert.match(lgContra.text, /pe 7 zile, în medie, botul plătește/);
  assert.equal(rand({ directie: "long" }, { rata: 0.0001, medieZi: -0.0006, acum: ACUM }).stare, "bine"); assert.equal(rand({ directie: "long" }, { rata: 0.0001, acum: ACUM }).stare, "atentie", "long, rată pozitivă: plătește");
  const nL = rand({ directie: "neutral", pozitie: 2 }, { rata: 0.0001, acum: ACUM }); assert.equal(nL.stare, "atentie", "neutru cu poziție long și rată pozitivă: plătește"); assert.match(nL.text, /botul \(acum pe long\) plătește/);
  const nS = rand({ directie: "neutral", pozitie: -2 }, { rata: 0.0001, acum: ACUM }); assert.equal(nS.stare, "bine"); assert.match(nS.text, /botul \(acum pe short\) încasează/);
  for (const bot of [{ directie: "neutral", pozitie: 0 }, { directie: "neutral" }, { directie: null }]) { const n0 = rand(bot, { rata: 0.0001, acum: ACUM }); assert.equal(n0.stare, "info", JSON.stringify(bot)); assert.doesNotMatch(n0.text, /încasează|plătește/); }
});

// ---------------- (C6) bot neutru cu stopul în procente ----------------
await test("(C6) bot neutru cu stop −10% din investiție: cartela nu-l numește „nepus · fără stop în Pionex” (stopul e activ, doar prețul lui nu se poate socoti)", () => {
  const b = botDeProba("no_trend", 71, 71.2, { stare: { q: 0.5, pd: 71, real: 0.2, fee: -0.05, grid: 0.3, perechi: 4 }, x: { position: "0.5", lossStop: "-0.10", lossStopType: "profit_ratio", estimateLiquidationPriceDown: "45", estimateLiquidationPriceUp: "96" } });
  assert.equal(b.opritorPierdereActiv, true); assert.equal(b.opritorPierdere, null, "premisa: la neutru prețul stopului nu se poate socoti");
  const e = ecran(b); assert.equal(e.st.mare, "−10%"); assert.match(e.st.mic, /stop în procente, activ/); assert.doesNotMatch(e.st.mare + e.st.mic + e.st.text, /nepus|fără stop în Pionex/, e.st.text.slice(0, 200));
});

// ---------------- (C7) bot neutru: ambele margini ----------------
await test("(C7) „marginea de jos” și „marginea de sus” nu sunt același fapt: amândouă rămân în „Contează acum” și în „Ce ai de făcut”", () => {
  const sf = [{ cod: "margine", ton: "atentie", parte: "jos", titlu: "Marginea de jos (65.0000) e la 3,1% de preț", text: "x", faCe: "N-aș mări levierul." }, { cod: "margine", ton: "atentie", parte: "sus", titlu: "Marginea de sus (76.0000) e la 2,4% de preț", text: "y", faCe: "N-aș mări levierul." }];
  const ct = Conteaza.alege({ stop: null, sfaturi: sf, lista: [], sanse: [], acum: ACUM }).filter((c) => c.cheie === "margine"); assert.equal(ct.length, 2, JSON.stringify(ct.map((c) => c.titlu)));
  const todo = TE.ceAiDeFacut({ acum: ACUM, dateLa: ACUM, sfaturi: sf, avertismente: [], alerte: [], planGol: false }).filter((t) => /Marginea de/.test(t.titlu)); assert.equal(todo.length, 2, JSON.stringify(todo.map((t) => t.titlu)));
  // control: același fapt cu altă cifră se unește în continuare
  const dublu = Conteaza.alege({ stop: null, sfaturi: [sf[0], Object.assign({}, sf[0], { titlu: "Marginea de jos (65.0000) e la 2,9% de preț" })], lista: [], sanse: [], acum: ACUM }).filter((c) => c.cheie === "margine"); assert.equal(dublu.length, 1);
});

// ---------------- (C10) bot spot fără „trend” ----------------
await test("(C10) bot de grid SPOT (fără „trend”): direcția e long, nu tipul gridului („arithmetic”); un bot fără trend și fără tip cunoscut rămâne fără direcție", () => {
  const raw = (tip) => ({ strategyId: "s1", base: "BTC", quote: "USDT", status: "open", buOrderType: tip, createTime: ACUM - 30 * ORA, buOrderData: { bottom: "90000", top: "110000", row: "21", gridType: "arithmetic", usdtInvestment: "500", gridProfit: "3.2", totalFee: "-0.4", status: "running" } });
  assert.equal(normalizeaza(raw("spot_grid"), { BTC_USDT: 101000 }, null).directie, "long"); assert.equal(normalizeaza(raw("altceva"), { BTC_USDT: 101000 }, null).directie, null);
  assert.equal(botDeProba("short", 71, 71).directie, "short", "futures: neschimbat");
});

// ---------------- (C13) texte mărunte ----------------
await test("(C13a) bot fără poziție: „n-are poziție, deci n-are un zero de socotit” (nu „lipsesc umplerile sau prețul”)", () => {
  const b = botDeProba("short", 65, 64), e = ecran(b); assert.ok(Math.abs(b.pozitie) < 1e-9);
  assert.doesNotMatch(e.st.act + " " + e.st.text, /lipsesc umplerile sau prețul/); assert.match(e.st.act + " " + e.st.text, /n-are poziție acum, deci n-are un zero de socotit/);
});
await test("(C13b) pe grid ARITMETIC protecția e la o treaptă peste margine (76,5), nu la „76.5205” (pasul în procente din prețul de acum)", () => {
  const e = ecran(botDeProba("short", 75, 75.3)); assert.ok(Math.abs(e.st.pretPropus - 76.5) < 1e-9, String(e.st.pretPropus));
  const l = ecran(botDeProba("long", 66, 65.7)); assert.ok(Math.abs(l.st.pretPropus - 64.5) < 1e-9, String(l.st.pretPropus));
});
await test("(C13c) o zecimală la rezultate („atins ≈ −8,3 USDT”); afirmația nemăsurată despre extremele de frică / lăcomie nu mai e dată ca fapt", () => {
  const SB_SRC = citeste("public", "lib", "semnale-bot.js"); assert.match(SB_SRC, /st0\.mic \+= " · atins ≈ " \+ TextRo\.usdt\(laOp, 1\)/); assert.doesNotMatch(citeste("public", "lib", "consiliu.js"), /Math\.round\(Math\.abs\(cost\)\)/);
  assert.doesNotMatch(citeste("public", "lib", "consilier.js"), /mișcările mari vin mai des în astfel de zile/); assert.doesNotMatch(citeste("public", "lib", "sfaturi.js"), /TextRo\.num\(rt\.medieZi, 2\)/);
});
await test("(C14) lângă „Rezultat total” scrie ora la care a fost citit botul (prețul de alături e viu, totalul nu)", () => {
  assert.match(APP, /pune\("tbKpiTotalSub",[^\n]*tbOraCitirii\(\)/); const c = dinApp(["tbOraCitirii"], { tbStare: { botLa: new Date(2026, 10, 13, 21, 34, 8).getTime() }, Date });
  assert.equal(c.tbOraCitirii(), " · citit 21:34:08"); c.tbStare.botLa = 0; assert.equal(c.tbOraCitirii(), "");
});

// ---------------- (C15) vârsta, ritmul și poziția botului la vedere ----------------
await test("(C15) cartela „Banii” spune de când rulează botul, câte perechi a făcut și în ce ritm, și poziția cu unitate, valoare și levierul efectiv", () => {
  const c = dinApp(["botiNr", "tbIdentitateBot"]), bot = (o) => Object.assign({ pornitLa: ACUM - 29 * ORA, ordinePerechi: 62, pozitie: -2.24, pretCurent: 73, investit: 76, levier: 3, baza: "MONEDA.PERP" }, o);
  const r = Array.from(c.tbIdentitateBot(bot(), ACUM)); assert.equal(r.length, 2);
  assert.equal(r[0].eticheta, "Rulează de"); assert.equal(r[0].valoare, "1 zi 5 h"); assert.match(r[0].nota, /62 de perechi · ≈ 2,1 pe oră/);
  assert.equal(r[1].eticheta, "Poziția acum"); assert.equal(r[1].valoare, "2,24 MONEDA"); assert.match(r[1].nota, /short · ≈ 163,5 USDT · levier efectiv 2,2× \(setat 3×\)/);
  const tanar = Array.from(c.tbIdentitateBot(bot({ pornitLa: ACUM - 20 * 60000, ordinePerechi: 1 }), ACUM)); assert.equal(tanar[0].valoare, "20 min"); assert.doesNotMatch(tanar[0].nota, /pe oră/);
  assert.equal(Array.from(c.tbIdentitateBot(bot({ pozitie: 0 }), ACUM))[1].valoare, "fără poziție"); assert.equal(Array.from(c.tbIdentitateBot(bot({ pornitLa: null, pozitie: null }), ACUM)).length, 0, "fără date nu inventează rânduri");
  assert.match(taie(APP, "tbDeseneazaBanii"), /tbIdentitateBot\(b,Date\.now\(\)\)/);
});

await test("(E) ora citirii botului pe rândurile „etichetă – cifră” ale cartelelor: ora întreagă e valoarea („citit … 23:44:05”), nu doar prima cifră; restul rândurilor rămân cum erau", () => {
  const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "asezare-paznic.js"), ctx);
  const K = ctx.AsezarePaznic.randuriKv;
  assert.match(K("citit 23:44:05"), />citit<\/span><b>23:44:05<\/b>/); assert.doesNotMatch(K("−0,8% din 50,0 investiți · citit 09:05:00"), /:05:00<\/span>/);
  assert.match(K("din citirea botului de la 9:41"), /<b>9:41<\/b>/, "și ora fără secunde");
  // neschimbate: prima cifră cu unitatea ei rămâne valoarea, iar o oră care vine DUPĂ ea rămâne în etichetă
  assert.match(K("~4,5 zile până pe zero la ritmul de azi"), /până pe zero la ritmul de azi<\/span><b>~4,5 zile<\/b>/);
  assert.match(K("+5 USDT de la 12:30"), /<b>\+5 USDT<\/b>/); assert.match(K("pe grilă 0,28% ≈ 0.028 USDT"), /<b>0,28% ≈ 0.028 USDT<\/b>/); assert.match(K("grid 70,5 – 74,5"), /<b>70,5 – 74,5<\/b>/);
  assert.match(APP, /typeof tbOraCitirii==="function"\?tbOraCitirii\(\):""/, "ora citirii stă pe rândul totalului");
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
