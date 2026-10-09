// Proba v100.149 / colector v101.92 (10.10, el: „fă tot” pe I-577..I-582):
// I-582 „deschide în Busolă” pe rândul Busolei; I-580 direcția și cifra Busolei pe 1h când graficul e sub 4h;
// I-578 paza: UN mesaj „toate vocile contra botului tău” care înlocuiește alertele separate; I-577 jurnalul vocilor (schimbarea frazei
// notată cu prețul, judecată după 24 h: cine a avut dreptate; bilanțul în citire); I-581 alertele cu „ce a urmat” după 24 h;
// I-579 Monte Carlo pe regimul Busolei: drumuri doar din ferestrele cu aceeași stare - mecanism + poartă de validare (nevalidat ⇒ nu intră în Tablou).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as P from "./lib/paza-boti.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import * as TM from "./lib/tura-monte-carlo-bot.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), COL = citeste("scripts", "colector.mjs"), API = citeste("functions", "api", "istoric-bot.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}") { a--; if (!a) break; } } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.149 · deschide în Busolă, Busola pe 1h, toate vocile contra, jurnalul vocilor, ce a urmat după alerte, Monte Carlo pe regim · proba\n");

const sandbox = (extra) => { const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }, extra || {}); vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx); return ctx; };
const B = sandbox().Busola;
const ACUM = Date.UTC(2026, 9, 10, 8, 0, 0), LA = ACUM - 20 * 60000, H4 = 4 * 3600000, H24 = 24 * 3600000;
const rez = (o) => Object.assign({ la: LA, versiune: "1.49.0", btc: { h24: -0.023, la: LA },
  monede: { MET: { perp4h: "nu-stiu", directie4h: "inclinat-short", corBtc: 0.72 }, BTC: { "1h": "nu-stiu", "4h": "nu-stiu", directie4h: "asteapta", directie1h: "inclinat-long", verdict4h: { cate: 66, ce: "ies din canalul 80.000–84.000 în următoarele 2 zile", deObicei: 66 }, verdict1h: { cate: 61, ce: "ating ținta înaintea stopului, pe long", deObicei: 52 }, corBtc: 1 } },
  grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.0094, miscare: -0.0113 },
  perp: { la: LA, monede: 138, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1910 } }, o || {});

await test("(I-582) Busola.linkBusola: adresa cu stare spre moneda și intervalul botului; rândul Busolei din citire are butonul", () => {
  assert.equal(B.linkBusola("MET_USDT_PERP", "4h"), "https://busola.mferent80.workers.dev/?sym=MET&interval=4h");
  assert.equal(B.linkBusola("1000PEPE_USDT_PERP", "1h"), "https://busola.mferent80.workers.dev/?sym=PEPE&interval=1h", "cheia fără „1000” (pe spot nu există)");
  assert.equal(B.linkBusola("", "4h"), null);
  const d = functie(APP, "tbDeseneazaCitire");
  assert.match(d, /x\.link\?'<a class="tbMcBtn tbCitLink" href="'\+escapeHtml\(x\.link\)\+'" target="_blank" rel="noopener">deschide în Busolă<\/a>':''/, "rd() desenează butonul când rândul are link");
  assert.match(functie(APP, "tbCitireExtra"), /out\.busola\.link=Busola\.linkBusola\(tbCheieBusola\(b\),"4h"\)/, "rândul Busolei primește adresa");
});
await test("(I-580) Busola.randDirectie / randVerdict pe 1h (o.interval) - pentru graficele sub 4h; fără comparația cu graficul pe 4h", () => {
  const r = rez();
  const d1 = B.randDirectie(r, "BTC_USDT_PERP", ACUM, { bot: "SHORT", interval: "1h" });
  assert.equal(d1.semn, "inclinat-long"); assert.equal(d1.nivel, "atentie"); assert.equal(d1.text, "înclinată spre long (nedovedită) · invers față de botul tău (short)");
  assert.equal(B.randDirectie(r, "BTC_USDT_PERP", ACUM, { bot: "SHORT", grafic: "urca", interval: "1h" }).text, "înclinată spre long (nedovedită) · invers față de botul tău (short)", "pe 1h graficul pe 4h nu se compară (alt orizont)");
  assert.equal(B.randDirectie(r, "BTC_USDT_PERP", ACUM, { bot: "SHORT", grafic: "urca" }).semn, "asteapta", "fără interval ⇒ 4h, ca până acum");
  assert.equal(B.randDirectie(r, "MET_USDT_PERP", ACUM, { bot: "LONG", interval: "1h" }).nivel, "nemasurat", "futures: n-are 1h");
  const c1 = B.randVerdict(r, "BTC_USDT_PERP", ACUM, { interval: "1h" });
  assert.equal(c1.text, "61 din 100 ating ținta înaintea stopului, pe long (ținta și stopul Busolei, pe 1h) · de obicei 52");
  assert.match(B.randVerdict(r, "BTC_USDT_PERP", ACUM).text, /^66 din 100 ies din canalul 80\.000–84\.000 în următoarele 2 zile · de obicei 66/, "fără interval ⇒ 4h");
  assert.equal(B.randVerdict(r, "MET_USDT_PERP", ACUM, { interval: "1h" }), null);
  const ex = functie(APP, "tbCitireExtra");
  assert.match(ex, /busolaDirectie1h/, "rândul „Direcția, după Busola (1h)”"); assert.match(ex, /busolaVerdict1h/, "rândul „Cifra Busolei (1h)”");
  assert.match(ex, /\/\^\(5M\|15M\|30M\|60M\)\$\/\.test\(tbTf\(\)\)/, "doar când graficul e sub 4h");
  assert.match(functie(APP, "tbDeseneazaCitire"), /\[ex\.busola,ex\.busolaDirectie1h,ex\.busolaVerdict1h,ex\.busolaDirectie,ex\.busolaVerdict,ex\.busolaGrid,ex\.busolaInterval,ex\.busolaBtc\]/, "ordinea: 1h înaintea celor pe 4h");
});
await test("(I-578) paza: UN mesaj „toate vocile contra botului tău” (≥ 2 voci), după 2 rezumate la rând, o dată pe episod; înlocuiește alertele separate", async () => {
  const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3, pornitLa: ACUM - H24 };
  const v1 = P.pazaVoci({ Busola: B, rez: rez(), bot, inainte: undefined, acum: ACUM, grafic: "coboara", mc: "rau" });
  assert.equal(v1.tine, true); assert.equal(v1.stare.contra, true); assert.equal(v1.stare.vazut, 1); assert.equal(v1.mesaj, null);
  const v2 = P.pazaVoci({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: v1.stare, acum: ACUM + H4, grafic: "coboara", mc: "rau" });
  assert.ok(v2.mesaj); assert.equal(v2.mesaj.cheie, "busola-voci"); assert.equal(v2.mesaj.nivel, "atentie");
  assert.match(v2.mesaj.titlu, /^MET long 3× · toate vocile contra: graficul pe 4h, Busola \(nedovedit\) și Monte Carlo/); assert.match(v2.mesaj.mesaj, /nu e un semnal de închidere/);
  const v3 = P.pazaVoci({ Busola: B, rez: rez({ la: LA + 2 * H4 }), bot, inainte: v2.stare, acum: ACUM + 2 * H4, grafic: "coboara", mc: "rau" });
  assert.equal(v3.mesaj, null, "episodul e anunțat o dată");
  const una = P.pazaVoci({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: v1.stare, acum: ACUM + H4, grafic: null, mc: null });
  assert.equal(una.stare.contra, false, "o singură voce contra (Busola) nu e „toate vocile”");
  const mixt = P.pazaVoci({ Busola: B, rez: rez({ la: LA + H4 }), bot, inainte: v1.stare, acum: ACUM + H4, grafic: "urca", mc: "rau" });
  assert.equal(mixt.stare.contra, false, "se contrazic ⇒ nu e „toate contra”");
  assert.equal(P.pazaVoci({ Busola: B, rez: rez(), bot: Object.assign({}, bot, { directie: "NEUTRAL" }), inainte: undefined, acum: ACUM, grafic: "coboara", mc: "rau" }).tine, false);
  // pazaPas: când pleacă mesajul vocilor, direcția și BTC NU mai trimit și ele în aceeași tură (episoadele lor se marchează anunțate)
  const st = {}, trimise = [];
  const pas = (r, acum) => P.pazaPas({ Busola: B, rez: r, bot, st, acum, pret: String, trimite: async (m) => { trimise.push(m.cheie); return true; }, monede: {}, voci: { grafic: "coboara", mc: "rau" } });
  await pas(rez(), ACUM); assert.deepEqual(trimise, []);
  await pas(rez({ la: LA + H4 }), ACUM + H4);
  assert.deepEqual(trimise, ["busola-voci"], "un singur mesaj, nu trei"); assert.equal(st._busolaDir.anuntatSemn, "inclinat-short"); assert.equal(st._busolaBtc.anuntatContra, true); assert.equal(st._busolaVoci.anuntat, ACUM + H4);
  assert.match(COL, /voci: \{ grafic: [^}]*dir4h[^}]*, mc: [^}]*\}/, "colectorul dă pazei graficul pe 4h (cache-ul direcției) și felul Monte Carlo");
  assert.equal(typeof MC.busolaVoci, "function");
});
await test("(I-577) jurnalul vocilor: vociBot (fraza + semnele), schimbarea, judecata după 24 h (cu cine a mers prețul), bilanțul", () => {
  const bot = { id: "9", baza: "MET.PERP", simbolPionex: "MET_USDT_PERP", directie: "LONG", levier: 3, pretCurent: 0.5 };
  const v = TM.vociBot({ Busola: B, rez: rez(), bot, grafic: "urca", mc: "bine", acum: ACUM });
  assert.equal(v.contrazic, true); assert.match(v.text, /^Vocile se contrazic/); assert.deepEqual(v.semne, { grafic: 1, busola: -1, mc: 1 }); assert.equal(v.dir, "long"); assert.equal(v.pret, 0.5); assert.equal(v.la, ACUM);
  assert.equal(TM.schimbareVoci(null, v), true); assert.equal(TM.schimbareVoci({ text: v.text }, v), false); assert.equal(TM.schimbareVoci({ text: "altceva" }, v), true);
  assert.equal(TM.vociBot({ Busola: B, rez: rez(), bot, grafic: null, mc: null, acum: ACUM }).contrazic, false);
  // judecata: prețul după 24 h din lumânările de 15 min (prima bară la ≥ la + 24 h); sub 0,2% = pe loc (nimeni n-a avut dreptate)
  const b15 = []; for (let i = 0; i <= 26 * 4; i++) b15.push({ t: ACUM + i * 900000, o: 0.5, h: 0.52, l: 0.49, c: i >= 96 ? 0.52 : 0.5, v: 1 });
  const lista = [{ la: ACUM, bot: "9", simbol: "MET_USDT_PERP", pret: 0.5, dir: "long", contrazic: true, semne: { grafic: 1, busola: -1, mc: 1 } },
    { la: ACUM, bot: "8", simbol: "NIL_USDT_PERP", pret: 1, dir: "short", contrazic: true, semne: { grafic: -1, busola: 1, mc: -1 }, dupa: { pret: 0.9 } },
    { la: ACUM + H24 - 60000, bot: "9", simbol: "MET_USDT_PERP", pret: 0.5, dir: "long", contrazic: true, semne: { grafic: 1, busola: 1, mc: 0 } }];
  const j = TM.judecaVoci(lista, { MET_USDT_PERP: b15 }, ACUM + 26 * 3600000);
  assert.equal(j.length, 1, "doar intrările scadente, fără „dupa”, cu bare"); assert.equal(j[0].la, ACUM); assert.equal(j[0].pret24, 0.52); assert.equal(j[0].pretDir, 1);
  const bil = B.bilantVoci([{ ...lista[0], dupa: { pret: 0.52, pretDir: 1 } }, { ...lista[1], dupa: { pret: 0.9, pretDir: -1 } }, { ...lista[2] }, { la: ACUM - 40 * H24, bot: "1", contrazic: true, semne: { grafic: 1, busola: -1, mc: 0 }, dir: "long", pret: 1, dupa: { pret: 2, pretDir: 1 } }], ACUM + 26 * 3600000);
  assert.equal(bil.judecate, 2, "30 de zile, doar cele judecate"); assert.deepEqual([bil.grafic, bil.busola, bil.mc], [2, 0, 1], "pe botul short „aș opri” cu prețul în jos e greșit (pentru short jos = bine)");
  assert.equal(bil.text, "în 30 de zile, 2 contraziceri judecate: a avut dreptate graficul pe 4h în 2, Busola în 0, Monte Carlo în 1 · prea puține sub 10");
  assert.equal(B.bilantVoci([], ACUM), null);
  assert.match(COL, /action=voci"/, "colectorul scrie jurnalul vocilor în KV"); assert.match(COL, /action=vociDupa"/, "…și judecata după 24 h");
  assert.match(API, /action==="voci"/); assert.match(API, /action==="vociDupa"/);
  assert.match(APP, /action=voci/, "Tabloul citește jurnalul"); assert.match(functie(APP, "tbDeseneazaCitire"), /tbVociBilant/, "bilanțul sub fraza vocilor");
});
await test("(I-581) alertele cu „ce a urmat”: prețul la alertă + prețul după 24 h; bilanțul pe tipuri; lista din Tablou le arată", () => {
  const TE = new Function(`${citeste("public", "lib", "text-ro.js")}; ${citeste("public", "lib", "grid-calcul.js")}; ${citeste("public", "lib", "tablou-extra.js")}; return TabloExtra;`)();
  const l = [{ t: ACUM, nivel: "atentie", titlu: "MET · Busola: mai agitată", cheie: "busola-miscare", bot: "9", pret: 0.5, dupa: { pret: 0.49 } },
    { t: ACUM, nivel: "atentie", titlu: "NIL · Busola: mai agitată", cheie: "busola-miscare", bot: "8", pret: 1, dupa: { pret: 1.03 } },
    { t: ACUM, nivel: "atentie", titlu: "PONS · mai agitată", cheie: "busola-miscare", bot: "7", pret: 2 },
    { t: ACUM, nivel: "info", titlu: "ceva", cheie: "ceas-larg", bot: "9", pret: 0.5, dupa: { pret: 0.5 } }];
  assert.equal(TE.dupaAlerta(l[0]), "după 24 h: −2,0%"); assert.equal(TE.dupaAlerta(l[2]), null); assert.equal(TE.dupaAlerta(l[3]), "după 24 h: 0,0%");
  const b = TE.bilantAlerte(l);
  assert.equal(b.length, 2); assert.equal(b[0].cheie, "busola-miscare"); assert.equal(b[0].n, 2); assert.equal(b[0].peMinus, 1); assert.equal(b[0].text, "«mai agitată»: prețul a scăzut în 1 din 2 după 24 h (prea puține)");
  assert.match(COL, /pret: pretBot\(bot\)/, "alerta pleacă în KV cu prețul botului"); assert.match(COL, /action=alerteDupa"/, "judecata după 24 h");
  assert.match(API, /action==="alerteDupa"/); assert.match(API, /pret:nr\(a\.pret\)/, "KV ține prețul alertei");
  assert.match(functie(APP, "renderTabloAlerte"), /TabloExtra\.dupaAlerta\(a\)/); assert.match(functie(APP, "renderTabloAlerte"), /TabloExtra\.bilantAlerte\(/);
});
await test("(I-579) Monte Carlo pe regim: ferestrele din jurnalul de stări al Busolei, starturile drumurilor doar din ele, poarta de validare", () => {
  const ctx = new Function(`${citeste("public", "lib", "text-ro.js")}; ${citeste("public", "lib", "grid-calcul.js")}; ${citeste("public", "lib", "grid-proba.js")}; ${citeste("public", "lib", "monte-simbol.js")}; ${citeste("public", "lib", "grid-sim.js")}; return { GridSim, GridCalcul };`)();
  const GS = ctx.GridSim;
  const stari = [{ la: ACUM - 3 * H4, monede: { MET: "miscare" } }, { la: ACUM - 2 * H4, monede: { MET: "liniste" } }, { la: ACUM - H4, monede: { MET: "miscare" } }, { la: ACUM, monede: { MET: "miscare" } }];
  const f = TM.ferestreRegim(stari, "MET", "miscare", ACUM + 1000);
  assert.deepEqual(f, [{ de: ACUM - 3 * H4, pana: ACUM - 2 * H4 }, { de: ACUM - H4, pana: ACUM + 1000 }], "rulările cu aceeași stare, lipite când sunt una după alta; ultima până acum");
  assert.deepEqual(TM.ferestreRegim(stari, "XXX", "miscare", ACUM), []);
  const b15 = []; for (let i = 0; i < 30 * 96; i++) { const t = ACUM - (30 * 96 - i) * 900000; b15.push({ t, o: 1, h: 1.01, l: 0.99, c: 1 + 0.001 * Math.sin(i), v: 1 }); }
  const fer = [{ de: ACUM - 10 * H24, pana: ACUM - 5 * H24 }];
  const st = GS.starturiRegim(b15, fer, 96);
  assert.ok(st.length > 0 && st.every((i) => b15[i].t >= fer[0].de && b15[i].t + 96 * 900000 <= fer[0].pana + 900000), "fiecare start (și blocul lui de o zi) cade în fereastră");
  assert.equal(GS.starturiRegim(b15, [], 96).length, 0);
  const set = GS.setariDinBot({ gridJos: 0.9, gridSus: 1.1, linii: 10, directie: "LONG", levier: 3, investit: 100 });
  const baza = GS.simuleaza(b15, Object.assign({}, set.st, { suma: 100 }), { n: 50, seed: 3, orizonturi: [7], zile: 14 });
  const reg = GS.simuleaza(b15, Object.assign({}, set.st, { suma: 100 }), { n: 50, seed: 3, orizonturi: [7], zile: 14, starturi: st });
  assert.ok(!baza.eroare && !reg.eroare && reg.regim && reg.regim.starturi === st.length, "simularea pe regim spune câte starturi a avut");
  assert.match(String(GS.simuleaza(b15, Object.assign({}, set.st, { suma: 100 }), { n: 50, seed: 3, orizonturi: [7], zile: 14, starturi: [1, 2] }).eroare || ""), /[Pp]rea puține/, "sub 3 zile de starturi: eroare pe nume");
  assert.match(functie(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), "turaMonteCarloBot"), /d\.regim/, "tura socotește și pe regim când are ferestre");
  assert.match(COL, /mc-regim-verdict\.json/, "poarta: verdictul validării de pe disc"); assert.match(COL, /jurnal-stari\.json/, "jurnalul de stări al Busolei, de pe același PC");
  assert.match(functie(APP, "tbMcRand"), /regim/, "Tabloul arată regimul doar când e validat");
  assert.ok(fs.existsSync(path.join(RAD, "scripts", "proba-mc-regim.mjs")), "proba de validare pe date reale există (în afara npm test)");
});
await test("(E) versiunea de la v100.149 în sus, colectorul v101.92+", () => {
  assert.match(HTML, /content="v100\.1(49|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(49|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(49|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(49|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(49|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(49|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(49|[5-9]\d)$/);
  assert.match(COL, /VERSIUNE_COLECTOR = "v101\.9[2-9]"/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
