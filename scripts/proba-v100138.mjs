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
  const l = functie(APP, "tbCitireLive"); assert.match(l, /tbCitLiveLa/); assert.match(l, /<1000\)/); assert.match(l, /\$\("tbCitireLive"\)/); assert.match(l, /tbDeseneazaCitire\(/);
});
await test("(c) index: cardul se numește „Ce spune piața acum”, cu ceasul live în antet; stilul pentru viu / vechi", () => {
  assert.match(HTML, /<h4>Ce spune piața acum<\/h4><span class="tbSub tbCitLive" id="tbCitireLive">live<\/span>/); assert.doesNotMatch(HTML, /Ce spune graficul acum/);
  assert.match(CSS, /#tabloubot \.tbCitLive\.viu\{/); assert.match(CSS, /#tabloubot \.tbCitLive\.vechi\{/);
});
await test("(d) tbCitireExtra (funcția adevărată, cu stub-uri): indicatorii pe intervalul graficului (sau pe 15 min când graficul e pe 5m), estimarea pe 16 ore, Busola pe 4h cu nota", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, IndicatoriBot: IB, TextRo: globalThis.TextRo };
  ctx.tbStare = { bot: { baza: "MET.PERP", quote: "USDT", directie: "LONG" }, graficInterval: "5M", directie: { simbol: "MET_USDT_PERP|LONG", indicatori: [
    { tf: "15M", eticheta: "15 min", q: { ver: "BULLISH", score: 62, supertrend: "BULL", macd: false, stoch: 72, mfi: 55, rsi: 52, bbpos: 50, adx: 13, ema: true }, hp: null },
    { tf: "4H", eticheta: "4 ore", q: { ver: "BEARISH", score: 38, supertrend: "BEAR", macd: true, stoch: 30, mfi: 40, rsi: 45, bbpos: 40, adx: 28, pdi: 10, mdi: 20 }, hp: { up: 61, avg: 0.012, inBanda: false } }] } };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = (b) => "MET_USDT_PERP|" + b.directie;
  ctx.Busola = { rezumat: () => ({ la: Date.now() - 3600000 }), eticheta: (rez, s, acum) => ({ stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "măsurat acum 1 h" }) };
  const src = "var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + functie(APP, "tbTf") + "\n" + functie(APP, "tbCitireExtra");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {});
  assert.equal(x.indicatori.ce, "Indicatorii"); assert.equal(x.indicatori.text, "pe 15 min: ↑ 62 · Supertrend ↑ · MACD ↓ · Stochastic 72: în partea de sus a intervalului · MFI 55: intră bani");
  assert.equal(x.estimare.ce, "Estimare pe 16 ore"); assert.match(x.estimare.text, /^urcare în 61%/, "fără eticheta repetată");
  assert.equal(x.busola.ce, "Busola, pe 4h"); assert.equal(x.busola.text, "mai agitată ca de obicei · măsurat acum 1 h"); assert.equal(x.busola.stare, "atentie");
  ctx.tbStare.graficInterval = "4H"; assert.match(ctx.tbCitireExtra(ctx.tbStare.bot, {}).indicatori.text, /^pe 4 ore: ↓ 38 · Supertrend ↓ · MACD ↑/);
  ctx.Busola = { rezumat: () => null, eticheta: () => null }; assert.match(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busola.text, /Busola n-a măsurat încă|aștept rezumatul/);
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
