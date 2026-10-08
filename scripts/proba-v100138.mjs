// Proba v100.138 (08.10, el: „ce spune graficul nu mă interesează cât a câștigat sau nu botul; acolo mă interesează doar direcție, trend,
// indicatori diverși, ce zice Busola … și foarte important să fie LIVE”; butonul „Stop de probă”: „îl scot de tot”):
// (a) GraficBot.citire cu doarPiata: fără banii botului; (b) rândurile noi: Indicatorii pe interval, Estimarea pe 16 ore, Busola pe 4h;
// (c) LIVE: recitire la fiecare tic de preț (cel mult o dată pe secundă) + ceas și preț în antet; (d) fără „Stop de probă”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
for (const f of ["grid-calcul.js", "tablou-extra.js", "grafic-bot.js", "indicatori-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const GB = globalThis.GraficBot, IB = globalThis.IndicatoriBot, HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
const rows = (n, pas, t0) => Array.from({ length: n }, (_, i) => { const t = (t0 || Date.UTC(2026, 9, 1)) + i * pas, p = 0.4 + 0.004 * Math.sin(i / 9) + 0.0003 * i; return [t, p, p * 1.003, p * 0.997, p * (1 + 0.0006 * ((i % 3) - 1)), 1000 + (i % 5) * 100]; });
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.138 · „Ce spune piața acum”: doar piața, indicatori + Busola, LIVE · proba\n");

const bare = GB.bare(rows(300, 3e5)), bot = { directie: "long", profitTotal: 0.64, pozitie: 95, investit: 44.1, pretCurent: 0.4678, gridJos: 0.42, gridSus: 0.5 };
const O = { bare, tfGrafic: "5M", niv: [{ k: "zero", p: 0.4645 }, { k: "stop", p: 0.42 }, { k: "planPlus", p: 0.47 }], funding: { rata: -0.00207, urmatoarea: Date.now() + 3600000, acum: Date.now(), sursa: "Binance" }, grila: { jos: 0.42, sus: 0.5 } };
await test("(a) GraficBot.citire cu doarPiata: ies Botul / Zero-ul / planul / Stopul / Gridul; rămân Direcția, Unde e prețul, ADX, Volumul, Funding; pe scurt fără bani", () => {
  const tot = GB.citire(O, bot, 0.46), piata = GB.citire(Object.assign({}, O, { doarPiata: true }), bot, 0.46);
  assert.ok(tot.randuri.some((r) => r.ce === "Botul"), "fără doarPiata e ca înainte");
  const ce = piata.randuri.map((r) => r.ce);
  for (const x of ["Botul", "Zero-ul botului", "Stopul", "Gridul"]) assert.ok(!ce.includes(x), x + " nu mai e: " + ce.join(", "));
  assert.ok(!ce.some((x) => /plan/i.test(x)), "planul nu mai e");
  for (const x of ["Direcția", "Unde e prețul", "ADX 14", "Volumul", "Funding"]) assert.ok(ce.includes(x), x + " rămâne: " + ce.join(", "));
  assert.match(piata.peScurt, /^direcția în (sus|jos) · piața/); assert.doesNotMatch(piata.peScurt, /USDT|botul|stopul/); assert.match(piata.peScurt, /RSI \d+$/);
  const fu = piata.randuri.find((r) => r.ce === "Funding").text; assert.doesNotMatch(fu, /botul (plătește|încasează)/, "rândul de funding fără banii botului: " + fu); assert.match(tot.randuri.find((r) => r.ce === "Funding").text, /botul (plătește|încasează)/, "în citirea întreagă rămâne");
});
await test("(b) app: citirea e pe piață (doarPiata), cu rândurile Indicatorii / Estimare / Busola, ținută pentru recitirea live; fără „Stop de probă”", () => {
  const f = functie(APP, "tbDeseneazaCitire");
  assert.match(f, /doarPiata:true/); assert.match(f, /tbCitireExtra\(/); assert.match(f, /tbStare\.citireO=o/); assert.doesNotMatch(f, /tbProbaComuta|Stop de probă|tbCitProba/);
  const e = functie(APP, "tbCitireExtra"); assert.match(e, /IndicatoriBot\.celule\(/); assert.match(e, /IndicatoriBot\.predictie\(/); assert.match(e, /Busola\.eticheta\(/);
  assert.match(functie(APP, "pvArata"), /tbCitireLive\(b,pa\)/);
  const l = functie(APP, "tbCitireLive"); assert.match(l, /tbCitLiveLa/); assert.match(l, /<1000\)/); assert.match(l, /data-cit-live/); assert.match(l, /tbDeseneazaCitire\(/);
  // revizia (2): recitirea live mută și lumânarea (RSI / Bollinger / ADX urmează prețul), nu doar pretViu
  assert.match(l, /GraficBot\.cuPretViu\(tbStare\.citireO\.bare,pa\.pret,Date\.now\(\)\)/); assert.match(l, /tbStare\.citireCheie!==/, "revizia (1): doar pentru botul / intervalul de acum");
});
await test("(c) index: cardul se numește „Ce spune piața acum”, cu ceasul live în antet; stilul pentru viu / vechi", () => {
  assert.match(HTML, /<h4>Ce spune piața acum<\/h4><span class="tbSub tbCitLive" id="tbCitireLive" data-cit-live>live<\/span>/); assert.doesNotMatch(HTML, /Ce spune graficul acum/);
  assert.match(CSS, /#tabloubot \.tbCitLive\.viu\{/); assert.match(CSS, /#tabloubot \.tbCitLive\.vechi\{/);
  assert.match(HTML, /<div id="tbCitire">/, "revizia: fără aria-live pe un bloc rescris pe secundă"); assert.match(CSS, /#tabloubot \.tbCitCap\{/);
});
await test("(d2) Indicatorii: fără „: ” gol când Stochastic lipsește; „pe bare închise” la Indicatorii și Estimare; Estimarea scurtă (fără „Nedovedit…”); Busola prin tbCheieBusola + kv, „nu răspunde” când e căzută; fără ADX „pe boții tăi”", () => {
  const e = functie(APP, "tbCitireExtra");
  assert.match(e, /tbCheieBusola\(b\)/); assert.match(e, /tbPazaKv\.boti\[b\.id\]/); assert.match(e, /Busola\.nuRaspunde\(\)/);
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, IndicatoriBot: IB, TextRo: globalThis.TextRo };
  ctx.tbStare = { bot: { id: "9", baza: "MET.PERP", quote: "USDT", directie: "LONG" }, graficInterval: "15M", directie: { simbol: "MET_USDT_PERP|LONG", indicatori: [
    { tf: "15M", eticheta: "15 min", q: { ver: "BULLISH", score: 62, supertrend: "BULL", macd: false, stoch: null, mfi: 55, rsi: 52, bbpos: 50, adx: 13, ema: true }, hp: null },
    { tf: "4H", eticheta: "4 ore", q: { ver: "BEARISH", score: 38 }, hp: { up: 44, avg: -0.004, inBanda: true } }] } };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = (b) => "MET_USDT_PERP|" + b.directie; ctx.tbCheieBusola = () => "MET_USDT_PERP"; ctx.tbPazaKv = { boti: { 9: { stare: "miscare", de: Date.now() - 7200000 } } };
  let primit = null; ctx.Busola = { rezumat: () => ({ la: Date.now() }), nuRaspunde: () => false, eticheta: (rez, s, acum, kv) => { primit = { s, kv }; return { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "de 2 h · măsurat acum 1 h" }; } };
  const src = "var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + functie(APP, "tbTf") + "\n" + functie(APP, "tbCitireExtra");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {});
  assert.equal(x.indicatori.text, "pe 15 min: ↑ 62 · Supertrend ↑ · MACD ↓ · Stochastic — · MFI 55: intră bani · pe bare închise");
  assert.match(x.estimare.text, /^fără semn/); assert.doesNotMatch(x.estimare.text, /Nedovedit|promisiune/); assert.match(x.estimare.text, / · pe bare închise de 4 ore$/);
  assert.deepEqual(primit, { s: "MET_USDT_PERP", kv: { stare: "miscare", de: ctx.tbPazaKv.boti[9].de } }); assert.equal(x.busola.text, "mai agitată ca de obicei · de 2 h · măsurat acum 1 h");
  ctx.Busola = { rezumat: () => null, nuRaspunde: () => true, eticheta: () => null }; assert.equal(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busola.text, "Busola nu răspunde acum");
});
await test("(R1) tbCitireLive NU recitește cu lumânările altui bot / interval; stampila merge pe toate elementele [data-cit-live], cu „acum N s” de la ultima tranzacție", () => {
  const c = cutieCitire(); const x = c.ctx;
  x.tbStare.citireO = { bare: GB.bare(rows(300, 3e5)), tfGrafic: "5M", niv: [], funding: null }; x.tbStare.citireCheie = "PONS_USDT_PERP|5M|1";
  x.tbStare.bot = { id: "2", baza: "BTC.PERP", quote: "USDT", directie: "LONG" }; c.simbol = "BTC_USDT_PERP";
  x.tbCitireLive(x.tbStare.bot, { viu: true, pret: 65000, text: "65000", la: Date.now() - 3000 });
  assert.equal(c.el.tbCitire.innerHTML, "", "nu scrie citirea monedei vechi cu prețul celei noi");
  assert.equal(c.stampuri().length, 2); assert.match(c.stampuri()[0], /^● live · acum 3 s · 65000$/); assert.ok(c.stampuri().every((s) => s === c.stampuri()[0]));
  x.tbCitireLive(x.tbStare.bot, { viu: false, pret: 64000, text: "64000", la: Date.now() - 400000 }); assert.match(c.stampuri()[0], /^○ fără preț live · ultimul 64000$/);
});
await test("(R2) recitirea live mută lumânarea: la +30% RSI-ul sare (nu rămâne pe cel de la ultimul desen) și „Unde e prețul” zice peste bandă", () => {
  const c = cutieCitire(); const x = c.ctx, bare = GB.bare(rows(300, 3e5)), P = bare[bare.length - 1].c;
  x.tbStare.citireO = { bare, tfGrafic: "5M", niv: [], funding: null, semafor: null }; x.tbStare.citireCheie = "PONS_USDT_PERP|5M|1"; x.tbStare.bot = { id: "1", baza: "PONS.PERP", quote: "USDT", directie: "LONG" };
  x.tbCitireLive(x.tbStare.bot, { viu: true, pret: P * 1.3, text: "x", la: Date.now() });
  assert.match(c.el.tbCitire.innerHTML, /RSI (7\d|8\d|9\d|100)\b/, c.el.tbCitire.innerHTML.slice(0, 300)); assert.match(c.el.tbCitire.innerHTML, /peste banda Bollinger/);
  assert.match(c.el.tbCitireMobil.innerHTML, /^<p class="tbCitCap"><b>Ce spune piața acum<\/b> <span class="tbSub tbCitLive viu" data-cit-live>● live/, "copia de pe telefon are antetul cu ceasul");
  assert.doesNotMatch(c.el.tbCitire.innerHTML, /tbCitCap/, "cardul are antetul lui în HTML");
  const h1 = c.el.tbCitire.innerHTML; c.scrieri = 0; x.tbCitLiveLa = 0; x.tbCitireLive(x.tbStare.bot, { viu: true, pret: P * 1.3, text: "x", la: Date.now() }); assert.equal(c.scrieri, 0, "același text ⇒ nu se rescrie DOM-ul"); assert.equal(c.el.tbCitire.innerHTML, h1);
});
await test("(R4) citirea doar-piață începe cu direcția de pe intervalul graficului (din semafor) când becurile există; ADX fără statistica „pe boții tăi”", () => {
  const sem = [{ tf: "5M", et: "5 min", sc: "5m", dir: "lateral", ton: "gol", text: "lateral" }, { tf: "15M", et: "15 min", sc: "15m", dir: "urca", ton: "bine", text: "urcă" }];
  const p = GB.citire(Object.assign({}, O, { doarPiata: true, semafor: sem, adxPeBoti: "pe boții tăi nu s-a dovedit că ajută" }), bot, 0.46);
  assert.match(p.peScurt, /^pe 5 min lateral · piața/); assert.match(GB.citire(Object.assign({}, O, { doarPiata: true, semafor: sem, tfGrafic: "15M" }), bot, 0.46).peScurt, /^pe 15 min urcă · /);
  assert.doesNotMatch(p.randuri.find((r) => r.ce === "ADX 14").text, /pe boții tăi/); assert.match(GB.citire(Object.assign({}, O, { semafor: sem, adxPeBoti: "pe boții tăi nu s-a dovedit că ajută" }), bot, 0.46).randuri.find((r) => r.ce === "ADX 14").text, /pe boții tăi/, "în citirea întreagă rămâne");
});
function cutieCitire() {   // tbDeseneazaCitire + tbCitireLive adevărate, cu DOM și stub-uri
  const el = {}, st = { el, scrieri: 0, simbol: "PONS_USDT_PERP" };
  const fa = (id) => ({ id, _h: "", attrs: {}, className: "", get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; st.scrieri++; }, textContent: "", setAttribute(k, v) { this.attrs[k] = v; } });
  ["tbCitire", "tbCitireMobil"].forEach((id) => { el[id] = fa(id); });
  const stamps = [{ textContent: "", className: "" }, { textContent: "", className: "" }];
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, GraficBot: GB, IndicatoriBot: IB, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])) };
  ctx.$ = (id) => el[id] || null; ctx.document = { querySelectorAll: (q) => (q === "[data-cit-live]" ? stamps : []) };
  ctx.tbStare = { bot: null, citireO: null, citireCheie: null, citireH: null, citireStamp: null, directie: null };
  ctx.TabloBot = { simboluri: () => ({ pionex: st.simbol }) }; ctx.tbCheieDir = (b) => st.simbol + "|" + b.directie; ctx.tbCheieBusola = () => st.simbol; ctx.tbPazaKv = { boti: {} };
  ctx.botiNr = (v) => (typeof v === "number" && isFinite(v) ? v : null); ctx.tbSemaforTf = () => null; ctx.Busola = undefined; ctx.tbCiteste = () => null; ctx.tbScrie = () => true; ctx.tbMcRand = () => null;
  const consts = ["TB_PERIOADE", "TB_TF_VECHI", "TB_TF_CHEIE"].map((n) => APP.match(new RegExp("var " + n + "=[^\\n]*;"))[0]).join("\n");
  const src = consts + "\n" + ["tbTf", "tbDeseneazaCitire", "tbCitireExtra", "tbCitireLive"].map((n) => functie(APP, n)).join("\n") + "\nvar tbCitLiveLa=0,tbCitLiveEroare=false;";
  vm.createContext(ctx); vm.runInContext(src, ctx);
  st.ctx = ctx; st.stampuri = () => stamps.map((s) => s.textContent); return st;
}
await test("(d) tbCitireExtra (funcția adevărată, cu stub-uri): indicatorii pe intervalul graficului (sau pe 15 min când graficul e pe 5m), estimarea pe 16 ore, Busola pe 4h cu nota", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, IndicatoriBot: IB, TextRo: globalThis.TextRo };
  ctx.tbStare = { bot: { baza: "MET.PERP", quote: "USDT", directie: "LONG" }, graficInterval: "5M", directie: { simbol: "MET_USDT_PERP|LONG", indicatori: [
    { tf: "15M", eticheta: "15 min", q: { ver: "BULLISH", score: 62, supertrend: "BULL", macd: false, stoch: 72, mfi: 55, rsi: 52, bbpos: 50, adx: 13, ema: true }, hp: null },
    { tf: "4H", eticheta: "4 ore", q: { ver: "BEARISH", score: 38, supertrend: "BEAR", macd: true, stoch: 30, mfi: 40, rsi: 45, bbpos: 40, adx: 28, pdi: 10, mdi: 20 }, hp: { up: 61, avg: 0.012, inBanda: false } }] } };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = (b) => "MET_USDT_PERP|" + b.directie; ctx.tbCheieBusola = () => "MET_USDT_PERP"; ctx.tbPazaKv = { boti: {} };
  ctx.Busola = { rezumat: () => ({ la: Date.now() - 3600000 }), nuRaspunde: () => false, eticheta: (rez, s, acum) => ({ stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "măsurat acum 1 h" }) };
  const src = "var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + functie(APP, "tbTf") + "\n" + functie(APP, "tbCitireExtra");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {});
  assert.equal(x.indicatori.ce, "Indicatorii"); assert.equal(x.indicatori.text, "pe 15 min: ↑ 62 · Supertrend ↑ · MACD ↓ · Stochastic 72: în partea de sus a intervalului · MFI 55: intră bani · pe bare închise");
  assert.equal(x.estimare.ce, "Estimare pe 16 ore"); assert.match(x.estimare.text, /^urcare în 61%/, "fără eticheta repetată");
  assert.equal(x.busola.ce, "Busola, pe 4h"); assert.equal(x.busola.text, "mai agitată ca de obicei · măsurat acum 1 h"); assert.equal(x.busola.stare, "atentie");
  ctx.tbStare.graficInterval = "4H"; assert.match(ctx.tbCitireExtra(ctx.tbStare.bot, {}).indicatori.text, /^pe 4 ore: ↓ 38 · Supertrend ↓ · MACD ↑/);
  ctx.Busola = { rezumat: () => null, nuRaspunde: () => false, eticheta: () => null }; assert.match(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busola.text, /Busola n-a măsurat încă|aștept rezumatul/);
  ctx.tbStare.directie = null; const g = ctx.tbCitireExtra(ctx.tbStare.bot, {}); assert.equal(g.indicatori, null); assert.equal(g.estimare, null);
});
await test("(e) proba veche v10099 nu mai cere butonul „Stop de probă” în citire", () => { assert.doesNotMatch(citeste("scripts", "proba-v10099.mjs"), /assert\.match\(fnApp\("tbDeseneazaCitire"\), \/data-action-click="tbProbaComuta/); });
await test("(E) versiunea de la v100.138 în sus (colectorul neatins)", () => {
  assert.match(HTML, /content="v100\.1(3[8-9]|[4-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(3[8-9]|[4-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(3[8-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[8-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[8-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[8-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[8-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
