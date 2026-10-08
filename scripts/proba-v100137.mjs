// Proba v100.137 (08.10, el: „în Tabloul botului mută graficul să fie primul sub rezultate și fă să meargă ușor să schimb time frame-urile”;
// a ales „intervale ca în TradingView”): (a) rândul graficului imediat sub KPI-uri, înaintea consilierului; (b) intervale 5m · 15m · 1h · 4h · 1z,
// fiecare cu perioada lui, lumânările ținute minte pe interval (schimbarea e instantă) și aduse din spate pentru celelalte; (c) butoane mari.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.137 · Tablou: graficul sub rezultate, intervale ca în TradingView, schimbare instantă · proba\n");

await test("(a) rândul graficului (cu „Ce spune graficul acum” și trendul) vine imediat după KPI-uri, înaintea consilierului", () => {
  const sec = HTML.slice(HTML.indexOf('<section class="panel" id="tabloubot">'), HTML.indexOf('<section class="panel" id="t212">'));
  const iSus = sec.indexOf('<div class="tbSus">'), iGr = sec.indexOf('<div class="tbGraficRand"'), iSem = sec.indexOf('id="tbSemaforCard"'), iCc = sec.indexOf('id="tbConcret"');
  assert.ok(iSus > 0 && iGr > 0 && iSem > 0, "blocurile există");
  assert.ok(iSus < iGr && iGr < iSem, "ordinea: KPI (" + iSus + ") → grafic (" + iGr + ") → consilier (" + iSem + ")");
  assert.doesNotMatch(sec.slice(iSus, iGr), /<section/, "între KPI și grafic nu mai stă nimic");
  assert.ok(iCc < 0 || iCc > iGr, "„Acum, concret” rămâne după grafic");
  assert.equal((sec.match(/class="tbGraficRand"/g) || []).length, 1, "o singură dată");
});
await test("(b1) butoanele de interval: 5m · 15m · 1h · 4h · 1z, cu perioada în title; cele vechi (24 ore / 3 zile / 7 zile) nu mai sunt", () => {
  assert.match(HTML, /<div class="tbInterval tbTf" role="group" aria-label="Intervalul lumânărilor">/);
  for (const [id, et, cat] of [["5M", "5m", "24 de ore"], ["15M", "15m", "3 zile"], ["60M", "1h", "7 zile"], ["4H", "4h", "30 de zile"], ["1D", "1z", "200 de zile"]])
    assert.match(HTML, new RegExp('<button type="button" class="tbIntBtn" id="tbInt' + id + '" aria-pressed="(true|false)" data-action-click="tbAlegeInterval\\(\'' + id + '\'\\)" title="[^"]*' + cat + '[^"]*">' + et + '</button>'), id);
  assert.match(HTML, /id="tbInt5M" aria-pressed="true"/, "5m e cel apăsat la pornire, ca înainte (24 de ore)");
  assert.doesNotMatch(HTML, /id="tbInt24h"|id="tbInt3z"|id="tbInt7z"|tbAlegeInterval\('24h'\)/);
});
await test("(b2) app: TB_PERIOADE pe intervale (5M/15M/60M/4H/1D, fiecare cu perioada și eticheta axei), cheile vechi mapate, fără „24h” implicit împrăștiat", () => {
  assert.match(APP, /var TB_PERIOADE=\{"5M":\{i:"5M",l:288,per:"24h",[^}]*\},"15M":\{i:"15M",l:288,per:"3z",[^}]*\},"60M":\{i:"60M",l:168,per:"7z",[^}]*\},"4H":\{i:"4H",l:180,per:"30z",[^}]*\},"1D":\{i:"1D",l:200,per:"200z",[^}]*\}\}/);
  assert.match(APP, /var TB_TF_VECHI=\{"24h":"5M","3z":"15M","7z":"60M"\}/);
  assert.match(functie(APP, "tbTf"), /TB_PERIOADE\[tbStare\.graficInterval\]/); assert.doesNotMatch(APP, /graficInterval\|\|"24h"/);
  assert.match(APP, /per:TB_PERIOADE\[tbTf\(\)\]\.per,semafor:tbSemaforTf\(b\),tfGrafic:TB_PERIOADE\[tbTf\(\)\]\.i,trendIstoric:tbTrendIstoric\(b\)/);
  assert.match(APP, /semClic:\{"5M":"tbAlegeInterval\('5M'\)","15M":"tbAlegeInterval\('15M'\)","60M":"tbAlegeInterval\('60M'\)","4H":"tbAlegeInterval\('4H'\)","1D":"tbAlegeInterval\('1D'\)"\}/, "becurile de pe grafic comută și pe 4h / 1z");
});
await test("(b3) schimbarea e instantă: lumânările stau în tbStare.graficCache pe simbol|interval, tbAlegeInterval le arată pe loc (fără la=0), tbAduGraficul le aduce din spate pe celelalte", () => {
  assert.match(APP, /var tbStare=\{[^\n]*graficCache:\{\}/);
  const al = functie(APP, "tbAlegeInterval"); assert.match(al, /TB_TF_VECHI\[/); assert.match(al, /tbStare\.graficCache\[/); assert.doesNotMatch(al, /\.la=0/); assert.match(al, /renderTabloGrafic\(\)/);
  const ad = functie(APP, "tbAduGraficul"); assert.match(ad, /tbStare\.graficCache\[cheieG\]=/); assert.match(ad, /tbPreiaRestulTf\(/);
  const pr = functie(APP, "tbPreiaRestulTf"); assert.doesNotMatch(pr, /pionex_klines|getJSON/, "revizia (4): fără cereri - lumânările vin din trend (randuriPe)"); assert.match(pr, /randuriPe\[/); assert.match(pr, /tbStare\.graficCache\[/);
  assert.match(functie(APP, "tbAlegeBot"), /graficCache=\{\}/, "alt bot ⇒ cache gol (nu lumânările altei monede)");
});
await test("(c) butoanele de interval sunt mari (apăsabile cu degetul) și pe telefon umplu rândul", () => {
  assert.match(CSS, /#tabloubot #tbGraficCard \.tbTf \.tbIntBtn\{[^}]*min-width:44px[^}]*\}/);
  assert.match(CSS, /@media \(max-width:640px\)\{#tabloubot #tbGraficCard \.tbTf\{width:100%\}#tabloubot #tbGraficCard \.tbTf \.tbIntBtn\{flex:1 1 0;min-width:0;min-height:44px\}\}/, "revizia (9): și înalte");
});

// ---------------- revizia Opus (b398ffe..76c3806) - comportamentul, nu regex ----------------
import vm from "node:vm";
const rows = (n, pas, t0) => Array.from({ length: n }, (_, i) => { const t = (t0 || Date.UTC(2026, 9, 1)) + i * pas, p = 0.4 + 0.001 * Math.sin(i / 7); return [t, p, p * 1.002, p * 0.998, p * (1 + 0.0005 * ((i % 3) - 1)), 1000 + (i % 5) * 100]; });
function cutie(stor) {   // sandbox cu funcțiile ADEVĂRATE din app.js și stub-uri pentru rest
  const ctx = { console, setTimeout, clearTimeout, Date, Math, Object, Array, JSON, String, Number, Promise, encodeURIComponent, isFinite };
  const consts = ["TB_PERIOADE", "TB_TF_VECHI", "TB_TF_CHEIE"].map((n) => { const m = APP.match(new RegExp("var " + n + "=[^\\n]*;")); if (!m) throw new Error(n + " lipsește"); return m[0]; }).join("\n");
  const src = consts + "\nvar TB_GRAFIC_MS=2*60000,TB_DIR_REINCERCARE_MS=30000;\n" + ["tbTf", "tbTfButoane", "tbAlegeInterval", "tbAduGraficul", "tbPreiaRestulTf"].map((n) => functie(APP, n)).join("\n");
  const el = {}, st = { cereri: [], pending: [], desenat: 0, stor: stor || {} };
  ctx.$ = (id) => el[id] || (el[id] = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } });
  ctx.tbStare = { bot: { id: "1", baza: "PONS.PERP", quote: "USDT", directie: "SHORT" }, grafic: null, graficCache: {}, graficPrefetch: false, directie: null };
  ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
  ctx.getJSON = (url) => new Promise((res) => { st.cereri.push(url.match(/interval=(\w+)/)[1]); st.pending.push(() => res({ data: { klines: rows(Number(url.match(/limit=(\d+)/)[1]), 3e5) } })); });
  ctx.renderTabloGrafic = () => { st.desenat++; }; ctx.tbPanouVizibil = () => true; ctx.textEroare = (e) => String(e && e.message || e);
  ctx.tbCheieDir = (b) => "PONS_USDT_PERP|" + (b.directie || ""); ctx.tbCiteste = (k) => (k in st.stor ? st.stor[k] : null); ctx.tbScrie = (k, v) => { st.stor[k] = v; return true; };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  st.ctx = ctx; st.el = el; st.flush = async () => { const p = st.pending; st.pending = []; p.forEach((f) => f()); for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 5)); };
  return st;
}
await test("(R1) clic pe alt interval cât se aduc încă lumânările: după ce vin, se aduce intervalul ALES (o singură dată fiecare), nu rămâne „Aștept prețurile…”", async () => {
  const c = cutie(), x = c.ctx; x.tbAduGraficul();
  await new Promise((r) => setTimeout(r, 5)); x.tbAlegeInterval("60M");
  await c.flush(); await c.flush(); await c.flush();
  assert.deepEqual(c.cereri, ["5M", "60M"], "cererile: " + c.cereri.join(","));
  assert.equal(x.tbStare.grafic.simbol, "PONS_USDT_PERP|60M"); assert.equal(x.tbStare.grafic.randuri.length, 168);
  assert.equal(c.el.tbInt60M.attrs["aria-pressed"], "true"); assert.equal(c.el.tbInt5M.attrs["aria-pressed"], "false");
});
await test("(R4) celelalte intervale vin din lumânările trendului (randuriPe), tăiate la perioada lor - zero cereri în plus; alt simbol în trend ⇒ nu", async () => {
  const c = cutie(), x = c.ctx; x.tbStare.directie = { simbol: "PONS_USDT_PERP|SHORT", la: Date.now(), randuriPe: { "5M": rows(500, 3e5), "15M": rows(500, 9e5), "60M": rows(500, 36e5), "4H": rows(500, 144e5), "1D": rows(400, 864e5) } };
  x.tbAduGraficul(); await c.flush(); await c.flush();
  assert.deepEqual(c.cereri, ["5M"]); assert.deepEqual(Object.keys(x.tbStare.graficCache).sort(), ["PONS_USDT_PERP|15M", "PONS_USDT_PERP|1D", "PONS_USDT_PERP|4H", "PONS_USDT_PERP|5M", "PONS_USDT_PERP|60M"]);
  assert.equal(x.tbStare.graficCache["PONS_USDT_PERP|4H"].randuri.length, 180); assert.equal(x.tbStare.graficCache["PONS_USDT_PERP|1D"].randuri.length, 200); assert.equal(x.tbStare.graficCache["PONS_USDT_PERP|5M"].randuri.length, 288, "cel adus rămâne cel adus");
  x.tbAlegeInterval("4H"); await c.flush(); assert.deepEqual(c.cereri, ["5M"], "4h din cache, proaspăt ⇒ nicio cerere"); assert.equal(x.tbStare.grafic.simbol, "PONS_USDT_PERP|4H"); assert.equal(x.tbStare.grafic.randuri.length, 180);
  const c2 = cutie(), y = c2.ctx; y.tbStare.directie = { simbol: "BTC_USDT_PERP|LONG", la: Date.now(), randuriPe: { "4H": rows(500, 144e5) } };
  y.tbAduGraficul(); await c2.flush(); await c2.flush(); assert.deepEqual(Object.keys(y.tbStare.graficCache), ["PONS_USDT_PERP|5M"], "lumânările altei monede nu intră");
});
await test("(R1b) intervalul ales sosește din trend cât ecranul spune „Aștept prețurile…” ⇒ se arată pe loc", async () => {
  const c = cutie(), x = c.ctx; x.tbStare.graficInterval = "4H"; x.tbStare.grafic = { la: Date.now(), simbol: "PONS_USDT_PERP|5M", randuri: rows(288, 3e5), eroare: null, inLucru: false };
  x.tbStare.directie = { simbol: "PONS_USDT_PERP|SHORT", la: Date.now(), randuriPe: { "4H": rows(500, 144e5) } };
  await x.tbPreiaRestulTf("PONS_USDT_PERP"); assert.equal(x.tbStare.grafic.simbol, "PONS_USDT_PERP|4H"); assert.ok(c.desenat >= 1);
});
await test("(R10) intervalul ales se ține minte (ca în TradingView): la reîncărcare pornește pe el; o valoare veche / stricată cade pe 5m", async () => {
  const c = cutie(), x = c.ctx; x.tbAlegeInterval("1D"); assert.equal(c.stor[x.TB_TF_CHEIE], "1D");
  assert.equal(cutie({ [c.ctx.TB_TF_CHEIE]: "1D" }).ctx.tbTf(), "1D"); assert.equal(cutie({ [c.ctx.TB_TF_CHEIE]: "3z" }).ctx.tbTf(), "15M", "cheia veche"); assert.equal(cutie({ [c.ctx.TB_TF_CHEIE]: "xx" }).ctx.tbTf(), "5M");
  assert.match(functie(APP, "renderTabloGrafic"), /tbTfButoane\(\)/, "butoanele se sincronizează cu intervalul ținut minte la primul desen");
});
await test("(R3) citirea graficului spune pe ce interval judecă: volumul „pe ultimele 2 zile” la 4h (nu „pe ultima oră”), RSI/ADX cu intervalul; axa la 1z arată doar ziua", () => {
  for (const f of ["grid-calcul.js", "tablou-extra.js", "grafic-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
  const GB = globalThis.GraficBot, b4 = GB.bare(rows(300, 144e5)), bot = { directie: "short" };
  const cit = (tf) => GB.citire({ bare: b4, tfGrafic: tf, niv: [], funding: null }, bot, 0).randuri, vol = (tf) => cit(tf).find((r) => r.ce === "Volumul").text;
  assert.match(vol("4H"), /pe ultimele 2 zile/); assert.match(vol("5M"), /pe ultima oră/); assert.match(vol("1D"), /pe ultimele 12 zile/); assert.match(vol("15M"), /pe ultimele 3 ore/); assert.match(vol("60M"), /pe ultimele 12 ore/);
  const r4 = cit("4H"); assert.match(r4.find((r) => r.ce === "Unde e prețul").text, /· lumânări de 4 ore$/); assert.match(r4.find((r) => r.ce === "ADX 14").text, /· lumânări de 4 ore$/);
  assert.ok(GB.citire({ bare: b4, tfGrafic: "4H", niv: [] }, bot, 0), "fără câmpul funding nu mai cade (undefined !== null)");
  const eticheta = (per, pas) => { const d = GB.desen({ bare: GB.bare(rows(80, pas)), W: 1000, st: {}, simplu: true, niv: [], per }); return (d.svg.match(/text-anchor="middle">([^<]+)<\/text>/g) || []).map((s) => s.replace(/.*>([^<]+)<.*/, "$1")); };
  const z = eticheta("200z", 864e5); assert.ok(z.length && z.every((s) => /^\d{1,2}\.\d{2}$/.test(s)), "1z: doar ziua: " + z.join(" | "));
  const h = eticheta("30z", 144e5); assert.ok(h.some((s) => /\d\.\d{2} \d{2}:\d{2}$/.test(s)), "4h: ziua și ora: " + h.join(" | "));
});
await test("(E) versiunea de la v100.137 în sus (colectorul neatins)", () => {
  assert.match(HTML, /content="v100\.1(3[7-9]|[4-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(3[7-9]|[4-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(3[7-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[7-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[7-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[7-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[7-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
