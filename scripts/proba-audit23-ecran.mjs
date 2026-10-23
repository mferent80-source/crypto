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

// ---------------------------------------------------------------- 8. Rezultate: implicit „doar ⭐ + 7 zile”, alegerea ținută minte
function rzIncarca(salvat, aruncaLa) {
  const i = APP.indexOf("var RZ_FILTRU_KEY="), j = APP.indexOf("function rzReincarca(");
  assert.ok(i >= 0 && j > i, "lipsește RZ_FILTRU_KEY înaintea funcțiilor rzZile / rzDoarStea / rzToate");
  const mem = {}; if (salvat !== undefined) mem["radar-rezultate-filtru-v1"] = salvat;
  const localStorage = { getItem: (k) => { if (aruncaLa) throw new Error("blocat"); return k in mem ? mem[k] : null; }, setItem: (k, v) => { if (aruncaLa) throw new Error("blocat"); mem[k] = String(v); } };
  const ctx = { localStorage, $: () => null, Rezultate: undefined, getJSON: async () => ({}), Date, Promise, JSON };
  vm.createContext(ctx);
  vm.runInContext(APP.slice(i, j).replace(/rzCalendar\(true\)\.then\(rzDeseneaza\)/g, "0"), ctx);
  return { ctx, mem };
}
await test("8a la prima deschidere: doar ⭐ și 7 zile", () => {
  const { ctx } = rzIncarca();
  assert.equal(ctx.rzStare.doarStea, true); assert.equal(ctx.rzStare.zile, 7);
});
await test("8b alegerea („toate”, 14 zile) se ține minte și se citește la pornire; stocarea blocată nu strică pagina", () => {
  const { ctx, mem } = rzIncarca();
  ctx.rzToate(); ctx.rzZile(14);
  const s = JSON.parse(mem["radar-rezultate-filtru-v1"]);
  assert.equal(s.doarStea, false); assert.equal(s.zile, 14);
  const b = rzIncarca(mem["radar-rezultate-filtru-v1"]).ctx;
  assert.equal(b.rzStare.doarStea, false); assert.equal(b.rzStare.zile, 14);
  const c = rzIncarca(undefined, true).ctx;
  assert.equal(c.rzStare.doarStea, true); c.rzToate(); assert.equal(c.rzStare.doarStea, false);
  const d = rzIncarca('{"zile":99,"doarStea":"x"}').ctx;
  assert.equal(d.rzStare.zile, 7, "o fereastră necunoscută cade pe 7");
});

// ---------------------------------------------------------------- 9. Tabloul pe telefon: verdict → grafic → cifre; Monte Carlo o dată
await test("9 CSS: pe telefon graficul vine înaintea KPI-urilor (ordinea 11–12 < 14), citirea după cifre; MC din citire tace cât e cardul de sus", () => {
  const i = CSS.indexOf("/* punctul 9:"); assert.ok(i >= 0, "lipsește blocul punctului 9");
  const b = CSS.slice(i, CSS.indexOf("/* audit 23.10 · sfârșitul blocului */"));
  assert.match(b, /\.pzDemo #tabloubot \.tbGrStanga>#tbGraficCard\{display:contents\}/);
  assert.match(b, /^\.pzDemo #tabloubot \.tbCadru>\.tbGraficRand>\.tbGrStanga>#tbGraficCard>#tbGrafic\{order:12\}/m);
  assert.match(b, /^\.pzDemo #tabloubot \.tbCadru>\.tbGraficRand>\.tbGrStanga>#tbGraficCard>#tbCitireMobil\{order:24\}/m);
  assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>\.tbSus\{order:14\}/, "KPI-urile rămân la 14");
  assert.match(b, /#tabloubot \.tbCadru:has\(>#tbMcSus:not\(\[hidden\]\)\) #tbCitireMobil \.tbCitMc\{display:none\}/);
});

// ---------------------------------------------------------------- 10. Piața azi pe telefon: cifrele contului o singură dată
await test("10 grila din „Acum” (telefon) se ascunde cât fâșia #pzKpi are cifre (aceleași 6 celule)", () => {
  assert.match(CSS, /#pzKpi:not\(:empty\)~#dash #pzAcum>\.pzAcumGrila\{display:none\}/);
});

// ---------------------------------------------------------------- 11. Salt la 1440: panoul „Vreau să cumpăr…” sub tabel sub 1600 px
await test("11 Salt: sub 1600 px grila e o coloană (tabelul pozițiilor nu mai derulează lateral, „Țintă” nu e tăiată)", () => {
  assert.match(CSS, /@media \(max-width:1599px\)\{#salt \.t212Grila\{grid-template-columns:minmax\(0,1fr\)\}\}/);
});

// ---------------------------------------------------------------- 12. Setări: comutatoarele sunt butoane role="switch"
await test("12 Setări: #toggleSr/Ls/Funding/Oi/Signal = <button type=button role=switch aria-checked>, aceeași acțiune; renderSettings ține aria-checked", () => {
  for (const [id, k] of [["toggleSr", "sr"], ["toggleLs", "ls"], ["toggleFunding", "funding"], ["toggleOi", "oi"], ["toggleSignal", "signal"]]) {
    const m = IDX.match(new RegExp('<(\\w+)([^>]*id="' + id + '"[^>]*)>'));
    assert.ok(m, "lipsește " + id);
    assert.equal(m[1], "button", id + " e " + m[1]);
    assert.match(m[2], /type="button"/); assert.match(m[2], /role="switch"/); assert.match(m[2], /aria-checked="true"/); assert.match(m[2], /aria-label="[^"]+"/);
    assert.match(m[2], new RegExp("data-action-click=\"toggleSetting\\('" + k + "'\\)\""));
  }
  assert.ok(!/<div class="toggle/.test(IDX), "a rămas un comutator div");
  assert.match(fnApp("renderSettings"), /el\.setAttribute\("aria-checked",x\.alerts\[k\]\?"true":"false"\)/);
  assert.match(CSS, /button\.toggle\{padding:0;font:inherit;appearance:none\}/);
});

// ---------------------------------------------------------------- 13. Perf: cu Tabloul în repaus nu se rescrie ce nu s-a schimbat
await test("13a contTotPune scrie innerHTML doar când s-a schimbat (fâșia contului, Piața azi, ideile — și pe #t212Card ascuns)", () => {
  const T = LIB("t212-ecran.js");
  const m = T.match(/function contTotPune\(el, h\) \{[^\n]*\}/); assert.ok(m, "lipsește contTotPune");
  const f = new Function("return " + m[0])();
  let scrieri = 0; const el = {}; Object.defineProperty(el, "innerHTML", { set() { scrieri++; }, get() { return ""; } });
  f(el, "<b>a</b>"); f(el, "<b>a</b>"); f(el, "<b>b</b>");
  assert.equal(scrieri, 2);
  assert.match(T, /document\.querySelectorAll\("\[data-cont-tot\]"\)\.forEach\(function \(el\) \{ contTotPune\(el, parti\.join/);
  assert.ok(!/document\.querySelectorAll\("\[data-cont-tot\]"\)\.forEach\(function \(el\) \{ el\.innerHTML =/.test(T), "fâșia contului se rescrie mereu");
});
await test("13b KPI-urile Tabloului (tbKpiPretDeseneaza / tbDeseneazaKpi): textul și clasa se pun doar când diferă", () => {
  for (const fn of ["tbKpiPretDeseneaza", "tbDeseneazaKpi"]) {
    const s = fnApp(fn);
    assert.match(s, /var pune=function\(id,text,cls\)\{var e=\$\(id\);if\(!e\)return;if\(e\.textContent!==text\)e\.textContent=text;if\(cls!=null\)\{var c=/, fn);
  }
});

// ---------------------------------------------------------------- 14. textele în engleză de pe paginile zilnice, în română; „NaN” nu are voie
await test("14a index.html: Futures (Selected market, Engine bias, Confidence, Volatility), Scanner, Monte Carlo, Setări, Cloud — în română", () => {
  for (const s of [">Selected market<", ">Engine bias<", ">Confidence —<", ">Regime —<", '<div class="label">Volatility</div>', ">Run simulation<", ">Loss probability<",
    ">Conservative<", ">Balanced<", "Run server monitor now", "Save current snapshot", "<span>Market Breadth</span>", ">Refresh breadth<", "<span>Results</span>", "<b>Regime</b>",
    "40/35/25 staged", " candles</option>", ">Coverage module<", ">Data quality<"]) assert.ok(!IDX.includes(s), "a rămas „" + s + "”");
  for (const s of [">Piața aleasă<", ">Direcția motorului<", ">Încredere —<", ">Rulează simularea<", ">Șansa de pierdere<", ">Prudent<", ">Echilibrat<", "<span>Lățimea pieței</span>", ">Rezultate<", "12 lumânări</option>"])
    assert.ok(IDX.includes(s), "lipsește „" + s + "”");
  assert.match(IDX, /value="BALANCED">Echilibrat</, "valorile opțiunilor rămân (BALANCED se citește în cod)");
});
await test("14b app.js: Piața azi (consensul, acoperirea, direcția de bază), Scanner (rezerva, lumânările), Setări (NEEDS CONFIG, Need ≥15) — în română; fără „NaN”", () => {
  for (const s of ["Base direction is", "Coverage este", "Data quality este", "Fallback ready", "NEEDS CONFIG", "Need ≥15 signals", "Binance candles", "Weighted module consensus"]) assert.ok(!APP.includes(s), "a rămas „" + s + "”");
  const m = APP.match(/function roConsens\([^\n]*/); assert.ok(m, "lipsește roConsens");
  const f = new Function("return " + m[0])();
  assert.equal(f("NO DATA"), "FĂRĂ DATE"); assert.equal(f("BULLISH"), "CRESCĂTOR"); assert.equal(f("BEARISH"), "DESCRESCĂTOR"); assert.equal(f("NEUTRAL"), "NEUTRU");
  assert.match(APP, /\$\("vcConsensus"\)\.textContent=\(typeof roConsens==="function"\?roConsens\(x\.consensus\):x\.consensus\)\+\(Number\.isFinite\(x\.weightedBias\)\?/);
  assert.match(APP, /\$\("decisionConsensus"\)\.textContent=`\$\{\(typeof roConsens==="function"\?roConsens\(vc\.consensus\):vc\.consensus\)\|\|"N\/A"\}/);
});

// ---------------------------------------------------------------- 15. virgula zecimală (nu punctul) și „−” tipografic
await test("15a Tablou: tbFormateazaSemn scrie cu virgulă și „−” („bara de 4 ore acum 7,1%”); chemătorii doar afișează", () => {
  const f = new Function("return " + fnApp("tbFormateazaSemn"))();
  assert.equal(f(7.12, 1), "7,1"); assert.equal(f(-0.808, 3), "−0,808"); assert.equal(f(0, 1), "0,0");
  assert.ok(!/parseFloat\([^)]*tbFormateazaSemn|Number\(tbFormateazaSemn/.test(APP), "un chemător citește înapoi textul");
});
// 15b (T212 „$25.17”): NEFĂCUT aici — t212Usd e „o singură formă” cu ActiuniSemnale.usd (actiuni-semnale.js, alt agent); gărzile v100.40/69/131/196 o cer.
await test("15c Nasdaq: schimbările cu virgulă și „−” (pctSemnRo), nu „+0.28%” / „-2.86%”", () => {
  const m = APP.match(/function pctSemnRo\([^\n]*/); assert.ok(m, "lipsește pctSemnRo");
  const f = new Function("return " + m[0])();
  assert.equal(f(0.28), "+0,28%"); assert.equal(f(-2.86), "−2,86%"); assert.equal(f(NaN), "—");
  for (const v of ["gap", "+qqqTick.priceChangePercent", "rel", "p20", "q20", "rs20"]) assert.ok(APP.includes("pctSemnRo(" + v + ")"), "Nasdaq: " + v);
});
await test("15d Contul Pionex: soldurile cu num() (ro-RO, virgulă), lichidarea „+22,9%”; Calendarul „estimat 55,4”", () => {
  assert.ok(!/\$\{escapeHtml\(x\.free\)\}/.test(APP) && !/\(\+x\.free\+ \+x\.frozen\)\.toFixed\(8\)/.test(APP), "soldurile cu punct");
  assert.match(fnApp("botiLichidareText"), /semn\+d\.toFixed\(1\)\.replace\("\.",","\)\+'%'/);
  assert.match(LIB("acasa-ecran.js"), /"estimat " \+ String\(x\.prognoza\)\.replace\(\/\(\\d\)\\\.\(\\d\)\/g, "\$1,\$2"\)/);
});

// ---------------------------------------------------------------- 16. formatul volumului (Grid: „4.507 k” = 4,5 M)
await test("16 TextRo.volum: „4,5 M”, „16 M”, „1,2 mld”, „850 k”, „720”; Grid → coloana Volum îl folosește", () => {
  assert.equal(typeof TR.volum, "function");
  for (const [v, t] of [[4507000, "4,5 M"], [16228000, "16 M"], [1234000000, "1,2 mld"], [850400, "850 k"], [720, "720"], [null, "—"], [NaN, "—"], [9990, "10 k"]]) assert.equal(TR.volum(v), t, String(v));
  assert.match(APP, /\(m\.volum!=null\?TextRo\.volum\(m\.volum\):"—"\)/);
  assert.ok(!/Math\.round\(m\.volum\/1000\)\.toLocaleString\("ro-RO"\)\+" k"/.test(APP));
});

// ---------------------------------------------------------------- 17. un singur formatator de preț sub 1 (TextRo.pret)
await test("17a TextRo.pret = GraficBot.fmtP (aceleași cifre semnificative); sub 1 PEPE iese „0.000004962” peste tot", () => {
  assert.equal(typeof TR.pret, "function");
  for (const v of [0.0000049623, 0.00000496, 0.000004960, 0.0000050871, 0.566, 0.0123, 0.99999, 1, 1.2345, 99.5, 108123.5, 0, null, NaN]) assert.equal(TR.pret(v), GB.fmtP(v), String(v));
  assert.equal(TR.pret(0.0000049623), "0.000004962");
});
await test("17b tbPretScurt: sub 1 = TextRo.pret; de la 1 în sus neschimbat (2 zecimale ≥ 100, 4 ≥ 1)", () => {
  const ctx = { TextRo: TR }; vm.createContext(ctx); vm.runInContext(fnApp("tbPretScurt"), ctx);
  assert.equal(ctx.tbPretScurt(0.0000050716), "0.000005072"); assert.equal(ctx.tbPretScurt(0.566), TR.pret(0.566));
  assert.equal(ctx.tbPretScurt(1.23456), "1.2346"); assert.equal(ctx.tbPretScurt(108123.456), "108123.46"); assert.equal(ctx.tbPretScurt(null), "—");
  const fara = {}; vm.createContext(fara); vm.runInContext(fnApp("tbPretScurt"), fara); assert.equal(fara.tbPretScurt(0.0000050716), "0.00000507", "fără TextRo: scrierea veche");
});
await test("17c Drumul (fP), banda și capul Tabloului scriu prețul sub 1 cu TextRo.pret (nu textul brut Pionex „0.0000050871”)", () => {
  assert.match(AS, /var fP = function \(v\) \{ return typeof TextRo !== "undefined" && TextRo\.pret \? TextRo\.pret\(v\) :/);
  assert.match(APP, /function bsPretText\(pa\)\{/);
  assert.match(fnApp("pvArata"), /bp\.textContent=bsPretText\(pa\)\+sag/);
  assert.match(fnApp("pvArata"), /\$\("tbPretViuVal"\)\.textContent=bsPretText\(pa\)\+sag/);
  assert.match(fnApp("pvArata"), /var pzT=pa\?bsPretText\(pa\)\+sag:""/);
  assert.match(APP, /if\(p\.k==="pret"&&r\.pret\)p\.t=bsPretText\(r\.pret\)\+p\.t\.slice\(String\(r\.pret\.text\)\.length\)/);
  const f = new Function("TextRo", "return " + APP.match(/function bsPretText\(pa\)\{[^\n]*/)[0])(TR);
  assert.equal(f({ pret: 0.0000050871, text: "0.0000050871" }), "0.000005087"); assert.equal(f({ pret: 108123.5, text: "108123.5" }), "108123.5", "≥ 1 rămâne textul Pionex");
});

// ---------------------------------------------------------------- 18. țintele de atingere pe telefon ≥ 44 px
await test("18 CSS (≤ 640 px): legăturile din citire, alegerile 10/30/60, comutatoarele Alerte/Scanner, rândurile și comutatoarele din Setări au ≥ 44 px", () => {
  const i = CSS.indexOf("/* punctul 18:"); assert.ok(i >= 0, "lipsește blocul punctului 18");
  const b = CSS.slice(i, CSS.indexOf("/* audit 23.10 · sfârșitul blocului */"));
  assert.match(b, /@media \(max-width:640px\)\{/);
  assert.match(b, /#tabloubot \.tbCitLink,#tabloubot \.tbMcBtn\{min-height:44px/);
  assert.match(b, /\.rlAlege \.rlK\{min-height:44px\}/);
  assert.match(b, /\.alComut,\.scComut\{min-height:44px\}/);
  assert.match(b, /#settings \.settingRow\{min-height:44px\}/);
  assert.match(b, /#settings button\.toggle::before\{content:"";position:absolute;left:-6px;right:-6px;top:-10px;bottom:-10px\}/);
  assert.match(IDX, /<label class="settingRow"><span>Doar pe durata sesiunii \(cercetare\)<\/span><input aria-label="[^"]+" id="privacySessionOnly" type="checkbox"\/><\/label>/);
});

// ---------------------------------------------------------------- 19. contrastul etichetelor Drumului (10,5 px) ≥ 4,5:1
await test("19 Drumul botului: etichetele (text de 10,5 px) au culoarea de text deschisă (≥ 4,5:1); liniuța de pe pistă rămâne în culoarea ei", () => {
  const ctx = incarcaAsezarea();
  const h = ctx.AsezarePaznic.drumHtml({ id: "1", baza: "PEPE.PERP", directie: "short", pretCurent: 0.0000049623, gridJos: 0.0000048, gridSus: 0.0000050,
    opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdere: 0.00000512 }, false, 1100);
  const et = [...h.matchAll(/<span class="pzDrumEt" style="[^"]*color:([^;"]+)/g)].map((m) => m[1]);
  assert.ok(et.length >= 3);
  for (const c of et) assert.match(c, /^var\(--pz(Info|Jos)Txt,#[0-9A-F]{6}\)$/, c);
  assert.match(h, /class="pzDrumNiv [^"]*" style="left:[\d.]+%;background:var\(--pzInfo\)"/, "liniuța rămâne în culoarea ei");
  const L = (x) => { const c = [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  for (const c of et) { const hex = c.match(/#[0-9A-F]{6}/)[0]; const r = (L(hex) + 0.05) / (L("#202B37") + 0.05); assert.ok(r >= 4.5, hex + " " + r.toFixed(2)); }
});

// ---------------------------------------------------------------- 20. accesibilitate: mișcare redusă; focusul se vede unde era outline:none
await test("20 CSS: regula prefers-reduced-motion; câmpurile și „detaliile” cu outline:none au înlocuitor :focus-visible", () => {
  assert.match(CSS, /@media \(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation-duration:\.01ms!important;animation-iteration-count:1!important;transition-duration:\.01ms!important;scroll-behavior:auto!important\}\}/);
  assert.match(CSS, /input:focus-visible,select:focus-visible,textarea:focus-visible\{outline:2px solid #5B8FC7;outline-offset:1px\}/);
  assert.match(CSS, /\.vcDetails>summary:focus-visible\{outline:2px solid #5B8FC7;outline-offset:2px\}/);
});

// ---------------------------------------------------------------- 21. Setări: starea parolei nu e verdictul dominant; bara de analiză nu stă pe Setări
await test("21 Setări: #pzV-settings .pzVerb mic (stare, nu decizie); show() pune body.peSetari, iar bara cu moneda + „Analizează piața” se ascunde acolo", () => {
  assert.match(CSS, /#pzV-settings \.pzVerb\{font-size:15px;white-space:normal;letter-spacing:\.02em\}/);
  assert.match(CSS, /body\.peSetari \.toolbar\{display:none\}/);
  assert.match(APP, /document\.body\.classList\.toggle\("peSetari",id==="settings"\)/);
});

// ---------------------------------------------------------------- 22. Grid: ce setez? — moneda în rândul de stare; câmpul precompletat cu botul activ
await test("22a grStareText: „PEPE · calculat la 13:44 · se reface singur la 5 min”; fără monedă în câmp nu scrie „calculat”", () => {
  const m = APP.match(/function grStareText\([^\n]*/); assert.ok(m, "lipsește grStareText");
  const f = new Function("return " + m[0])();
  const la = new Date(2026, 9, 23, 13, 44).getTime();
  assert.match(f({ la, simbol: "PEPE_USDT_PERP", inLucru: false }, "PEPE"), /^PEPE · calculat la 13:44 · se reface singur la 5 min$/);
  assert.doesNotMatch(f({ la, simbol: "PEPE_USDT_PERP", inLucru: false }, ""), /calculat/);
  assert.match(f({ la, simbol: "PEPE_USDT_PERP", inLucru: true }, "PEPE"), /^calculez/);
  assert.doesNotMatch(f({ la: 0, simbol: null, inLucru: false }, "PEPE"), /calculat/);
  assert.match(fnApp("renderGrid"), /stare\.textContent=grStareText\(grStare,\$\("grMoneda"\)&&\$\("grMoneda"\)\.value\)/);
});
await test("22b porneGrid precompletează moneda cu botul activ când câmpul e gol (nu suprascrie ce a scris el)", () => {
  assert.match(fnApp("porneGrid"), /var gm=\$\("grMoneda"\);if\(gm&&!gm\.value\.trim\(\)&&tbStare\.bot&&tbStare\.bot\.baza\)gm\.value=String\(tbStare\.bot\.baza\)\.replace\(\/\\\.PERP\$\/,""\)/);
});

// ---------------------------------------------------------------- 23. T212: o singură pierdere în lei pe poziție, cu sursa scrisă
const ctxCo = { TextRo: TR, console }; ctxCo.window = ctxCo; vm.createContext(ctxCo); vm.runInContext(LIB("consiliu.js"), ctxCo);
const CO = ctxCo.Consiliu;
// datele lui (AVGO, 23.10): 2,8187 buc., mediu $399,96, acum $321,74; T212: ppl −772,98 lei, din care fxPpl +279,13 (cursul a urcat de la cumpărare)
const AVGO = { sem: { nivel: "iesi", motive: ["stopul care urcă e atins"] }, niv: { stopPozitie: 339.46, stopAtins: true }, prob: [], sfaturi: [], plan: null, pret: 321.74, pretMediu: 399.96018385, qty: 2.81865557, costLei: 5110, simbol: "AVGO" };
await test("23a „dacă vinzi acum”: suma în lei e cea din contul T212 (ppl), cu sursa scrisă — nu dolarii × cursul de la cumpărare", () => {
  const c = CO.alcatuiesteActiune(Object.assign({}, AVGO, { pplLei: -772.98 }));
  assert.match(c.bani, /^dacă vinzi acum: −220,5 \$ \(−773 lei în contul T212, cu cursul de azi\)/, c.bani);
  assert.doesNotMatch(c.bani, /≈ −1\.000|≈ −99\d lei/);
});
await test("23b fără ppl (Salt, colectorul) rămâne „≈ … lei”, iar suma la stop spune „la cursul de cumpărare”", () => {
  const c = CO.alcatuiesteActiune(Object.assign({}, AVGO, { niv: { stopPozitie: 300 } }));
  assert.match(c.bani, /^dacă vinzi acum: −220,5 \$ \(≈ −999 lei\)/, c.bani);
  assert.match(c.bani, /dacă atinge stopul care urcă \(\$300(\.00)?\): −281,8 \$ \(≈ −1\.277 lei, la cursul de cumpărare\)$/, c.bani);
  assert.match(LIB("t212-ecran.js"), /costLei: p\.cost, pplLei: p\.ppl,/);
});

// ---------------------------------------------------------------- 24. „Cât cumperi”: bucățile în jos (floor), suma refăcută din bucățile afișate
await test("24 t212MarimeAfisata: sub 10 $ bucăți întregi în JOS (1,5 ⇒ 1, nu 2), suma/riscul/comisionul refăcute; sub o bucată rămâne fracția; de la 10 $ în jos la 3 zecimale", () => {
  const T = LIB("t212-ecran.js");
  const m1 = T.match(/function t212MarimeAfisata\(m, pret\) \{[^\n]*\n(?:[^\n]*\n)*?\}/); assert.ok(m1, "lipsește t212MarimeAfisata");
  const mb = T.match(/function t212Bucati\([^\n]*/)[0];
  const ctx = {}; vm.createContext(ctx); vm.runInContext(m1[0] + "\n" + mb, ctx);
  const m = { bucati: 1.5, suma: 600, risc: 60, riscPctReal: 0.01, comision: 1.8, riscTotal: 100, riscTotalPct: 0.02, plafonat: true };
  const a = ctx.t212MarimeAfisata(m, 8);
  assert.equal(a.bucati, 1); assert.equal(a.suma, 400); assert.equal(a.risc, 40); assert.ok(Math.abs(a.riscPctReal - 0.00667) < 1e-4); assert.ok(Math.abs(a.comision - 1.2) < 1e-9);
  assert.equal(a.riscTotal, 80); assert.ok(Math.abs(a.riscTotalPct - (0.02 - 0.01 + 0.01 / 1.5)) < 1e-9);
  assert.equal(ctx.t212Bucati(a.bucati, 8), "1 buc");
  const b = ctx.t212MarimeAfisata({ bucati: 0.4, suma: 160, risc: 16, riscPctReal: 0.004, comision: 0.48 }, 8);
  assert.equal(b.bucati, 0.4); assert.equal(b.suma, 160); assert.equal(ctx.t212Bucati(b.bucati, 8), "0,4 buc", "sub o bucată: fracția, nu „0 buc”");
  const c = ctx.t212MarimeAfisata({ bucati: 2.34567, suma: 1000, risc: 50, riscPctReal: 0.01, comision: 3 }, 120);
  assert.equal(c.bucati, 2.345); assert.ok(c.suma <= 1000 && c.suma > 999);
  assert.equal(ctx.t212MarimeAfisata(null, 8), null);
  assert.match(T, /var m = t212MarimeAfisata\(pl\.m, pl\.intrare\), fara = t212FaraSuma\(p\)/);
  assert.match(T, /m = fara \? null : t212MarimeAfisata\(t212MarimePoarta\(p\), baza\)/);
});

// ---------------------------------------------------------------- 25. „Cât investesc?” ia și coada de 5% a Simulatorului (p5)
await test("25 grRandSumaMaxima dă lui sumaMaxima p5-ul Simulatorului pe aceeași monedă (cel mai rău orizont / sumă); altă monedă sau fără simulare ⇒ null", () => {
  const m = APP.match(/function grP5Simulator\(f\)\{[^\n]*/); assert.ok(m, "lipsește grP5Simulator");
  const mk = (gs) => new Function("gsStare", "return " + m[0])(gs);
  const rez = { suma: 100, orizonturi: [{ zile: 1, p5: -4 }, { zile: 7, p5: -22 }, { zile: 14, p5: -15 }] };
  assert.equal(mk({ sim: "PEPE", rez })({ simbol: "PEPE_USDT_PERP" }), -0.22);
  assert.equal(mk({ sim: "BTC", rez })({ simbol: "PEPE_USDT_PERP" }), null);
  assert.equal(mk({ sim: "PEPE", rez: { eroare: "x" } })({ simbol: "PEPE_USDT_PERP" }), null);
  assert.equal(mk({ sim: "PEPE", rez: null })({ simbol: "PEPE_USDT_PERP" }), null);
  const g = fnApp("grRandSumaMaxima");
  assert.match(g, /var p5=grP5Simulator\(f\),max=GridProba\.sumaMaxima\(sold,pierdere,rea,p5\)/);
  assert.match(g, /cele mai proaste 5% din drumurile Simulatorului/);
});

console.log(`\n${teste - picate}/${teste} trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
process.exit(picate ? 1 : 0);
