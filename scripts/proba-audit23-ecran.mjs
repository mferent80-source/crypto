// Probele auditului sever din 23.10.2026, felia ECRANULUI (layout, UX, texte, formatare, accesibilitate).
// Fiecare test numește punctul din listă (1..26). Gărzile sunt pe desen (modulele pure) unde se poate, textuale unde nu.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js"), IDX = citeste("public", "index.html"), CSS = citeste("public", "app.css");
const LIB = (f) => citeste("public", "lib", f);
const fnApp = (nume) => { const i = APP.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i, j < 0 ? undefined : j); };
const TR = globalThis.TextRo;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\naudit 23.10 · ecranul · proba\n");

// ---------------------------------------------------------------- 1. scara de preț crește cu textul
const SRC_GB = ["public/lib/grid-calcul.js", "public/lib/tablou-extra.js", "public/lib/semnale-bot.js", "public/lib/grafic-bot.js"].map((f) => citeste(f)).join("\n");
const GB = new Function(`${SRC_GB}; return typeof GraficBot !== "undefined" ? GraficBot : null;`)();
const T0 = 1_790_500_000_000, M5 = 5 * 60000;
function klines(baza, n = 288) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = baza * (1 - 0.087 * (i / (n - 1)) + 0.0065 * Math.sin(i / 5)), o = i ? Number(out[i - 1].close) : c;
    out.push({ time: T0 + i * M5, open: String(o), close: String(c), high: String(Math.max(o, c) * 1.002), low: String(Math.min(o, c) * 0.998), volume: String(1000 + 500 * Math.abs(Math.sin(i / 7))) });
  }
  return out.reverse();
}
const latText = (s) => Math.round(s.length * 6.3);   // 11 px, cifre ≈ 6,3 px
await test("1a PEPE (0,0000049…): scara crește cu textul — eticheta gbAxa nu intră peste lumânări, cutia gbAxaAcum își cuprinde textul", () => {
  const d = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h", pretViu: 0.0000049623 });
  const gut = d.harta.W - d.harta.plotW;
  const axe = [...d.svg.matchAll(/<text class="gbAxa" x="([\d.]+)"[^>]*>([^<]+)</g)].map((m) => ({ x: Number(m[1]), t: m[2] }));
  assert.equal(axe.length, 3, "trei prețuri");
  for (const a of axe) assert.ok(a.x - latText(a.t) >= d.harta.plotW + 2, `„${a.t}” începe la ${a.x - latText(a.t)}, plotul se termină la ${d.harta.plotW} (scara ${gut})`);
  const m = d.svg.match(/<g class="gbAxaAcum"><rect x="([\d.]+)" y="[\d.]+" width="(\d+)"[^>]*\/><text x="([\d.]+)"[^>]*>([^<]+)</);
  assert.ok(m, "lipsește gbAxaAcum");
  assert.ok(Number(m[2]) >= latText(m[4]) + 6, `cutia ${m[2]} px, textul „${m[4]}” ≈ ${latText(m[4])} px`);
  assert.ok(Number(m[1]) >= d.harta.plotW, "cutia prețului de acum intră peste lumânări");
});
await test("1b JTO (0,5…): scara rămâne 52 px (minimul), plotW 948 la 1000 px; scara oprită ⇒ 0", () => {
  const d = GB.desen({ bare: GB.bare(klines(0.62)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h" });
  assert.equal(d.harta.plotW, 948);
  const off = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 1000, ingust: false, st: {}, niv: [], grila: {}, per: "24h", scara: false });
  assert.equal(off.harta.plotW, 1000);
  const tel = GB.desen({ bare: GB.bare(klines(0.0000052)), W: 390, ingust: true, st: {}, niv: [], grila: {}, per: "24h" });
  assert.equal(tel.harta.plotW, 390, "telefonul nu are scară");
});


// ---------------------------------------------------------------- 2. etichetele „Drumului botului” nu se calcă pe telefon
const AS = LIB("asezare-paznic.js");
function incarcaAsezarea() {
  const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {}, remove() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 390, localStorage: { getItem: () => null, setItem() {} }, console, TabloExtra: globalThis.TabloExtra };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
  return ctx;
}
// intervalul REAL al etichetei: fără ancoră e centrată; „translateX(-6px)” pornește din punct; „calc(-100% + 6px)” se termină în punct
function intervaleDrum(h, W) {
  return [...h.matchAll(/<span class="pzDrumEt" style="left:([\d.]+)%;([^"]*?)top:(\d+)px[^"]*">([\s\S]*?)<\/span>/g)].map((m) => {
    const cx = Number(m[1]) * W / 100, txt = m[4].replace(/<[^>]+>/g, ""), w = txt.length * 6.3;
    const a = /translateX\(-6px\)/.test(m[2]) ? cx - 6 : /calc\(-100% \+ 6px\)/.test(m[2]) ? cx + 6 - w : cx - w / 2;
    return { txt, top: Number(m[3]), a, b: a + w };
  });
}
await test("2 Drumul botului la 384 px: două etichete pe același rând nu se suprapun, socotit pe ancorarea reală (margine stânga/dreapta)", () => {
  const ctx = incarcaAsezarea();
  const W = 384;
  const h = ctx.AsezarePaznic.drumHtml({ id: "1", baza: "PEPE.PERP", directie: "short", pretCurent: 0.0000049623, gridJos: 0.0000048, gridSus: 0.0000050,
    opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdere: 0.00000512 }, false, W);
  const I = intervaleDrum(h, W);
  assert.ok(I.length >= 3, "etichetele lipsesc: " + I.length);
  for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) if (I[i].top === I[j].top)
    assert.ok(I[i].b + 4 <= I[j].a || I[j].b + 4 <= I[i].a, `„${I[i].txt}” [${I[i].a.toFixed(0)}–${I[i].b.toFixed(0)}] se calcă cu „${I[j].txt}” [${I[j].a.toFixed(0)}–${I[j].b.toFixed(0)}]`);
  for (const x of I) assert.ok(x.a >= -2 && x.b <= W + 2, `„${x.txt}” iese din cartelă: ${x.a.toFixed(0)}–${x.b.toFixed(0)}`);
});

// ---------------------------------------------------------------- 3. frâna de cantitate T212 stă pe cardul Nasdaq, cu tonul frânei
const ctxAc = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctxAc.window = ctxAc; vm.createContext(ctxAc); vm.runInContext(LIB("acasa.js"), ctxAc);
const AC = ctxAc.Acasa;
const linA = () => AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const largaA = () => AC.vremeBursa({ qqq: Array.from({ length: 260 }, (_, i) => ({ c: 100 + i * 0.2 })), vix: 14, ndx: { e50: 70, n: 100 } });
const abA = (extra) => Object.assign({ raportStare: "ok", raport: { reconciliere: { t212: { abateri: [{ ticker: "AAPL_US_EQ" }] } }, valoare: { total: 100000 }, risc: { var95: 1000 } } }, extra || {});
await test("3a cardul Crypto nu poartă frâna de acțiuni (abaterea de cantitate T212 / exportul nepotrivit)", () => {
  assert.match(AC.franaVerb(linA(), abA({ fel: "crypto" })).faCe, /^Aș porni/);
  assert.match(AC.franaVerb(linA(), { fel: "crypto", raportStare: "ok", exportNePotrivit: true, raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } }).faCe, /^Aș porni/);
});
await test("3b cardul Nasdaq: fraza spune că e la T212 și unde se vede (Contul întreg); tonul e al frânei (atenție)", () => {
  const r = AC.franaVerb(largaA(), abA({ fel: "bursa" }));
  assert.match(r.faCe, /T212/); assert.match(r.faCe, /Contul întreg/); assert.ok(r.faCe.length <= 110, r.faCe);
  assert.equal(r.ton, "atentie");
  const r2 = AC.franaVerb(largaA(), { fel: "bursa", exportNePotrivit: true });
  assert.match(r2.faCe, /T212/);
  assert.equal(AC.franaVerb(linA(), { fel: "crypto", pauza: true, pauzaN: 3 }).ton, "atentie", "și pauza e o frână");
  assert.equal(AC.franaVerb(largaA(), { fel: "bursa" }).ton, undefined, "fără frână, tonul e al pieței");
});
await test("3c desenul: titlul frânat are clasa lui, CSS-ul îl colorează cu --warn; exportul nepotrivit ajunge și la bursă", () => {
  const AE = LIB("acasa-ecran.js");
  assert.match(AE, /v\.ton === "atentie" \? " acFacFrana" : ""/);
  assert.match(CSS, /#dash \.acVerd \.acFac\.acFacFrana\{color:var\(--warn\)\}/);
  const f = AE.slice(AE.indexOf("function acFraneaza("), AE.indexOf("function acMasuraLin("));
  assert.ok(f.indexOf("acExportNePotrivit()") < f.indexOf('if (fel === "crypto")'), "exportul nepotrivit se cere doar pentru crypto");
});

// ---------------------------------------------------------------- 4. Futures: fără niciun semnal ⇒ „—”; rezerva Binance cere 1000PEPEUSDT
function ruleazaDerivatives(raspuns) {
  const el = {}, cerute = [];
  const $ = (id) => (el[id] = el[id] || { textContent: "", className: "", innerHTML: "" });
  const src = fnApp("derivatives").replace(/^function derivatives\(\)/, "async function()").replace(/\nlet scannerRows=\[\];[\s\S]*$/, "");
  const deps = { $, assetClass: () => "CRYPTO", norm: (s) => s, document: { getElementById: (id) => $(id) }, window: {}, markFresh() {},
    simBinanceFut: APP.includes("function simBinanceFut(") ? new Function("return " + APP.match(/function simBinanceFut\([^\n]*/)[0])() : (s) => s,
    getJSON: async (u) => { cerute.push(u); if (u.startsWith("/api/")) return raspuns; throw new Error("400"); },
    oiChangeAt: () => NaN, pctText: (x) => String(x), fundingSummary: () => null, fundingRo: (x) => x == null ? "N/A" : String(x), compact: (x) => String(x),
    eroareDeParola: () => false, textEroare: (e) => String(e && e.message), updateFlowWindow() {}, renderLiquidationProxy() {}, renderQuantFlow() {} };
  $("symbol").value = "PEPEUSDT";
  const f = new Function(...Object.keys(deps), "return (" + src + ")")(...Object.values(deps));
  return f().then(() => ({ el, cerute, st: deps.window.__derivativesState }));
}
await test("4a Funding, OI și L/S toate N/A ⇒ contextul e „—” (fără date), nu BALANCED galben; starea nu inventează un context", async () => {
  const r = await ruleazaDerivatives({ funding: null, openInterest: null, longShort: null });
  assert.doesNotMatch(r.el.fcontext.textContent, /BALANCED|ECHILIBRAT/i);
  assert.match(r.el.fcontext.textContent, /—/);
  assert.doesNotMatch(r.el.fcontext.className, /neutral/);
  assert.ok(r.st.context == null, "context: " + r.st.context);
});
await test("4b rezerva Binance cere simbolul de futures 1000PEPEUSDT (PEPE, SHIB, BONK, FLOKI… stau în mii pe Binance)", async () => {
  const r = await ruleazaDerivatives({ funding: null, openInterest: null, longShort: null });
  const bin = r.cerute.filter((u) => /fapi\.binance\.com/.test(u));
  assert.ok(bin.length >= 5, "rezerva Binance n-a fost cerută");
  for (const u of bin) assert.match(u, /symbol=1000PEPEUSDT/, u);
  assert.match(APP, /function simBinanceFut\(/);
});
await test("4c cu un semnal (funding) contextul rămâne socotit ca înainte", async () => {
  const r = await ruleazaDerivatives({ funding: 0.0005, openInterest: null, longShort: null });
  assert.equal(r.el.fcontext.textContent, "CROWDED");
});

// ---------------------------------------------------------------- 5. banda botului: culoarea după efectul pe bot
await test("5a bsTonEfect: la SHORT prețul în sus e rău (jos = roșu), la LONG bine; totalul pe minus e roșu, nu galbenul benzii", () => {
  const m = APP.match(/function bsTonEfect\([^\n]*/);
  assert.ok(m, "lipsește bsTonEfect");
  const f = new Function("return " + m[0])();
  assert.equal(f("sus", "short"), "jos"); assert.equal(f("jos", "short"), "sus");
  assert.equal(f("sus", "long"), "sus"); assert.equal(f("jos", "long"), "jos"); assert.equal(f("egal", "short"), "egal");
  const p = fnApp("pvArata");
  assert.match(p, /bz\.className="bsParte "\+bsTonEfect\(zt\.ton,b\.directie\)/, "pvArata rescrie „azi” cu tonul prețului");
  assert.match(APP, /p\.k==="zi"&&p\.ton\)p\.ton=bsTonEfect\(p\.ton,b\.directie\)/);
  assert.match(APP, /p\.k==="total"&&b\.profitTotal!=null\)p\.ton=/);
});

// ---------------------------------------------------------------- 6. fâșia contului: „alerte necitite”, nu „alerte 0” sub „CRITICE: 4+”
await test("6 fâșia contului numește celula „necitite” (deschiderea Alertelor le citește; nu contrazice „CRITICE: 4+”)", () => {
  assert.doesNotMatch(AS, /cel\("alerte", a\.t/);
  assert.match(AS, /cel\("alerte necitite", a\.t/);
});

// ---------------------------------------------------------------- 7. Contul Pionex: boții se citesc la deschidere, nu rămân „—” cu NECĂUTAT
await test("7 deschiderea paginii Cont citește boții o dată (doar cât e NECĂUTAT); citirea e doar GET /api/bot-orders", () => {
  assert.match(APP, /else if\(id==="account"\)\{loadPionexAccount\(\);loadPionexOpenOrders\(\);var bs0=\$\("botiStare"\);if\(bs0&&\/NEC\[ĂA\]UTAT\/\.test\(bs0\.textContent\)\)incarcaBoti\(false\)\}/);
  assert.match(fnApp("incarcaBoti"), /getJSON\('\/api\/bot-orders'\)/);
});

console.log(`\n${teste - picate}/${teste} trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
process.exit(picate ? 1 : 0);
