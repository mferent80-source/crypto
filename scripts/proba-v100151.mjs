// Proba v100.151 (11.10.2026, el: „pagina crypto … cu designul din paznic, fără să se piardă nimic” → demo aprobat → „faci toată app la fel
// și verifici să nu se piardă absolut nimic”): (1) tema PAZNIC în app.css · (2) fonturile IBM Plex LOCALE (CSP-ul nu lasă Google Fonts)
// · (3) graficul: perechile închise jos, nu inele pe lumânări · (4) așezarea (lib/asezare-paznic.js) și capcanele prinse pe demo · (5) versiunile.
// Inventarul „nimic pierdut” (51 de pagini × 1920/390, foaia veche vs nouă în aceeași clipă) se rulează în browser, nu aici - vezi memoria.
import assert from "node:assert/strict";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js"), APP = citeste("public", "app.js");
const AS = citeste("public", "lib", "asezare-paznic.js");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.151 · designul PAZNIC: tema, fonturile locale, graficul, așezarea · proba\n");

const VECHI = ["#55d89b", "#ff6b78", "#f5c451", "#4fd1c5", "#69a7ff", "#90a0b6", "#f5f7fb", "#071018", "#0a1520", "#0d1722", "#e9eef6", "#6d7d93", "#1fa99c", "#d9772f", "#8b74f0", "rgba(85,216,155,", "rgba(255,107,120,", "rgba(245,196,81,", "rgba(79,209,197,", "rgba(105,167,255,"];

await test("(1) tema: jetoanele PAZNIC, nicio culoare veche în foaie, colțuri ≤ 5 px (cercurile rămân 50%), fără umbre cu blur, fără sticlă", () => {
  assert.match(CSS, /--bg:#0E141A;--panel:#141C24;[^}]*--good:#26A96C;--bad:#E5615A;--warn:#E9B949/);   /* v100.162: roșul de TEXT #E5615A (contrast ≥4,5 pe fondurile temei; #E0524A avea 4,48 / 4,10) - lumânările rămân #E0524A */
  for (const c of VECHI) assert.ok(!CSS.toLowerCase().includes(c.toLowerCase()), "culoare veche în app.css: " + c);
  const mari = (CSS.match(/border-radius\s*:\s*[^;}]+/g) || []).filter((v) => !/%|var\(|inherit/.test(v)).filter((v) => (v.match(/(\d+(?:\.\d+)?)px/g) || []).some((x) => parseFloat(x) > 5));
  assert.deepEqual(mari, [], "colțuri mari rămase");
  const umbre = (CSS.match(/box-shadow\s*:\s*[^;}]+/g) || []).map((v) => v.replace(/box-shadow\s*:\s*/, "").trim()).filter((v) => !/^(none|inherit)/.test(v) && !/^(inset )?\d+(px)? \d+(px)? 0 /.test(v) && !/^0 0 0 /.test(v) && !/^var\(--focus/.test(v) && !/^inset [0-9.]+px 0 0 /.test(v));
  assert.deepEqual(umbre, [], "umbre cu blur rămase");
  assert.ok(!/backdrop-filter\s*:\s*blur/.test(CSS), "sticlă rămasă");
  assert.match(CSS, /\.topStatus\{background:#141C24!important/, "bara de sus: fond plin (fără sticlă, translucidul lăsa textul să se vadă prin ea)");
});
await test("(2) fonturile IBM Plex sunt LOCALE: @font-face spre /fonts/*.woff2 care există, Sans + Mono × 400/500/600 × latin/latin-ext (diacriticele), fără Google Fonts; CSP-ul rămâne strict", () => {
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|@import/.test(CSS), "cerere externă de fonturi");
  const urls = [...CSS.matchAll(/url\((\/fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  assert.equal(new Set(urls).size, 12, "12 fișiere de font");
  for (const u of urls) assert.ok(fs.existsSync(path.join(RAD, "public", u)), "lipsește " + u);
  assert.match(CSS, /font-family:"IBM Plex Sans"[^;]*;font-style:normal;font-weight:600;[^}]*latin-ext-600[^}]*unicode-range:U\+0100-02BA/);
  assert.ok(fs.existsSync(path.join(RAD, "public", "fonts", "LICENTA-IBM-Plex-OFL.txt")), "licența OFL lângă fonturi");
  const csp = citeste("public", "_headers"); assert.doesNotMatch(csp, /googleapis|gstatic/, "CSP-ul nu s-a deschis spre Google");
});
await test("(3) graficul: perechile închise NU mai stau pe lumânări (nici inel, nici săgeată) - liniuță verde jos, cu același titlu; umplerile deschise rămân gri/galbene; legenda spune unde au plecat; paleta PAZNIC validată", () => {
  const ACUM = Date.UTC(2026, 9, 11, 9, 0, 0), M5 = 300000;
  const B5 = Array.from({ length: 288 }, (_, i) => { const t = ACUM - (288 - i) * M5, c = 0.5 + 0.05 * i / 287; return { t, o: c, h: c * 1.002, l: c * 0.998, c, v: 10 }; });
  const umpl = (ri, tip, p, pereche) => ({ t: B5[ri].t, ri, k: 0, p, tip, pereche: !!pereche });
  const baza = { bare: B5, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM }, C = G.COL;
  const inchise = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531, true), umpl(200, "B", 0.533, true)], perechi: 2 } }));
  assert.doesNotMatch(inchise.svg, /class="gbUmplere/, "grupa închisă nu mai stă pe lumânare");
  assert.doesNotMatch(inchise.svg, /<circle[^>]*r="6"/, "fără inel");
  assert.match(inchise.svg, /<g class="gbPerecheJos"><title>[^<]*pereche închisă[^<]*<\/title><rect x="[\d.]+" y="([\d.]+)" width="3" height="6"[^>]*fill="#26A96C"/);
  const y = +inchise.svg.match(/class="gbPerecheJos"><title>[^<]*<\/title><rect x="[\d.]+" y="([\d.]+)"/)[1]; assert.equal(y, inchise.harta.mainH + 1, "în fâșia dintre preț și banda de trend");
  const deschise = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(286, "S", 0.539), umpl(286, "S", 0.537)], perechi: 0 } })).svg;
  assert.ok(deschise.includes('fill="' + C.mut + '" stroke="' + C.fond + '"'), "deschise de curând = gri"); assert.doesNotMatch(deschise, /gbPerecheJos/);
  const amestec = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(286, "B", 0.531, true), umpl(286, "B", 0.533)], perechi: 1 } })).svg;
  assert.ok(amestec.includes('fill="' + C.mut + '" stroke="' + C.fond + '"'), "amestec: săgeata e a celei DESCHISE (gri), nu verde");
  assert.match(amestec, /<title>1 din 2 umpleri cu perechea închisă\n/); assert.match(amestec, /gbPerecheJos/, "și liniuța pentru cea închisă");
  const d = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531, true)], perechi: 1 } }));
  assert.match(d.legenda, /gri = deschisă · galben = deschisă de peste o oră · perechile închise = liniuțele verzi de jos · perechi pe grafic: 1/);
  assert.match(G.desen(Object.assign({}, baza, { simplu: true, umpleri: { umpleri: [umpl(200, "B", 0.531, true)], perechi: 1 } })).legenda, /perechi închise, jos \(1\)/);
  assert.deepEqual([C.good, C.bad, C.warn, C.fond, C.ema20, C.ema50, C.bb, C.mut], ["#26A96C", "#E0524A", "#E9B949", "#0E141A", "#C25E98", "#C9824A", "#9B7FE0", "#8799AA"], "paleta (EMA/BB: validatorul dataviz ALL PASS pe #0E141A; EMA 20 NU e albastrul benzii gridului - revizia I9; griul axelor 6,32:1, #63788A avea 4,04)");
  assert.notEqual(C.ema20, C.accent, "EMA 20 ≠ banda gridului");
  assert.ok(!/NaN|undefined/.test(inchise.svg + amestec), "NaN/undefined în SVG");
});
await test("(4) așezarea: scriptul e în pagină și în cache-ul offline; capcanele prinse pe demo au gardă (specificitatea ordinii, Tabloul pe alte pagini, banda botului pe telefon, regula pandei ultima)", () => {
  assert.match(HTML, /<script defer="" src="\/lib\/alerte-ecran\.js"><\/script><script defer="" src="\/lib\/asezare-paznic\.js"><\/script>/);
  assert.match(SW, /"\/lib\/asezare-paznic\.js"/); for (const f of ["sans", "mono"]) for (const w of [400, 500, 600]) assert.match(SW, new RegExp(`"/fonts/ibm-plex-${f}-latin-${w}-normal\\.woff2"`));
  /* doar regulile v100.151 (pz* / .tbCadru>); „#tabloubot .tbIdei{order:0}” e mai veche și pierde oricum în fața lor (1 id + 1 clasă) */
  const ord = [...CSS.matchAll(/^([^{\n]*)\{order:(\d+)\}/gm)].map((m) => m[1]).filter((s) => /.pzDemo #tabloubot/.test(s));   /* doar Tabloul; paginile v100.152 le păzește proba-v100152 */
  assert.ok(ord.length >= 25, "regulile de ordine: " + ord.length);
  for (const sel of ord) assert.match(sel, /^\.pzDemo #tabloubot \.tbCadru>/, "ordinea pierde la specificitate (în demo verdictul ajunsese JOS): " + sel);
  assert.match(CSS, /#tabloubot\.pzCuColoana\.on\{display:grid!important/, "doar pe pagina activă - altfel Tabloul apărea și pe Health");
  /* revizia Opus C2: banda botului are ceasul gridului îngust, „LICHIDARE DEPĂȘITĂ”, prețul live - NU se ascunde nicăieri; celulele arată doar contul */
  assert.doesNotMatch(CSS, /#botStrip\{display:none/, "banda botului ascunsă undeva");
  assert.match(CSS, /#pzKpi\{display:flex;flex-wrap:wrap;[^}]*overflow:hidden\}/, "fâșia contului se rupe pe rânduri (nimic tăiat la dreapta)");
  assert.doesNotMatch(CSS, /#pzKpi\{[^}]*overflow-x:auto/, "fără derulare ascunsă în fâșie (celulele de la coadă ieșeau din ecran)");
  /* revizia Opus C1: fond și text în aceeași regulă - niciun contrast sub 3:1 (banda OFFLINE ieșise galben pe galben) */
  const Lu = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const slabe = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => { const bg = m[2].match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b(?!\s*,)/), co = m[2].match(/(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/); if (!bg || !co || /gradient/.test(m[2])) return null; const x = Lu(bg[1]), y = Lu(co[1]), k = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); return k < 3 ? m[1].trim().slice(0, 60) + " " + k.toFixed(2) : null; }).filter(Boolean);
  assert.deepEqual(slabe, [], "text ilizibil pe fondul lui");
  assert.match(CSS, /\.offlineBanner\{[^}]*background:#E9B949;color:#0E141A/, "banda OFFLINE se citește");
  assert.match(CSS, /#tabloubot \.tbPill,\.t212Pill\{color:#0E141A\}/, "pastilele colorate cu text închis (alb pe galben = 1,83:1)");
  for (const f of ["sans", "mono"]) for (const w of [400, 500, 600]) assert.match(SW, new RegExp(`"/fonts/ibm-plex-${f}-latin-ext-${w}-normal\\.woff2"`), "diacriticele offline: " + f + w);
  assert.equal(pandaInainteaCozii(CSS), "", "regula pandei (v100.150) stă după orice regulă de tabel - bate .t212Tab thead");
  assert.match(CSS, /:root\{--latime-pagina:1800px\}/, "paginile mai late (1600 → 1800), toate la fel");
  assert.ok(CSS.lastIndexOf("--latime-pagina:1800px") > CSS.indexOf("--latime-pagina:1600px"), "1800 vine DUPĂ 1600 (cascada)");
});
await test("(5) așezarea, pur: proza → rânduri etichetă–cifră (valorile întregi, escapate), ancora etichetelor la margine, glosarul", () => {
  const ev = [], doc = { documentElement: { classList: { add() {} } }, addEventListener(t) { ev.push(t); }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { innerText: "", classList: { add() {} } } };
  const ctx = { window: {}, document: doc, setInterval() {}, setTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
  const A = ctx.AsezarePaznic; assert.ok(A && typeof A.randuriKv === "function", "AsezarePaznic.randuriKv");
  const r = A.randuriKv("din grid +1.70 USDT · pe grilă 0,28% ≈ 0.028 USDT · funding 0,012% pe zi, media 7 zile · plătești ≈ 0,2 USDT pe săptămână");
  const randuri = [...r.matchAll(/<div class="pzKv">(?:<span class="pzK[^"]*"[^>]*>([^<]*)<\/span>)<b>([^<]*)<\/b><\/div>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(randuri, [["din grid", "+1.70 USDT"], ["pe grilă", "0,28% ≈ 0.028 USDT"], ["funding, media 7 zile", "0,012% pe zi"], ["funding plătit", "≈ 0,2 USDT pe săptămână"]]);   /* „≈” rămâne: cifra e aproximată */
  assert.match(A.randuriKv("ritmul de recuperare se socotește după o zi de viață"), /<span class="pzKfara">ritmul de recuperare/, "fără cifră ⇒ rândul întreg, nu tăiat");
  /* revizia Opus I6: unitatea „zile” rămâne lângă cifră; „bonus,” nu-și pierde litera (era /s+,/ în loc de /\s+,/) */
  assert.match(A.randuriKv("~4,5 zile până pe zero la ritmul de azi"), /până pe zero la ritmul de azi<\/span><b>~4,5 zile<\/b>/);
  assert.match(A.randuriKv("bonus, 3 USDT"), />bonus<\/span><b>3 USDT<\/b>/);
  /* revizia Opus I3: T212 cu „deschise” pe plus */
  assert.equal(A.t212Din("Trading 212 · 29.189 lei · deschise +123 lei").deschise, "+123"); assert.equal(A.t212Din("Trading 212 · 29.189 lei · deschise −2.250 lei").minus, true); assert.equal(A.t212Din("fără rând"), null);
  /* revizia Opus I2: colectorul = inima lui (config.colectorLa), regula Tabloului „merge” până la 3 min - nu ora Monte Carlo */
  const T = Date.UTC(2026, 9, 11, 12, 0); assert.equal(JSON.stringify(A.colectorDin({ colectorLa: T - 2 * 60000 }, T)), JSON.stringify({ min: 2, viu: true })); assert.equal(JSON.stringify(A.colectorDin({ colectorLa: T - 50 * 60000 }, T)), JSON.stringify({ min: 50, viu: false })); assert.equal(A.colectorDin(null, T), null);
  /* revizia Opus C2: lichidarea - |distanța|, „depășită” se spune; pragurile = ale Tabloului (8 / 15) */
  assert.equal(A.lichDin([{ distantaLichidarePct: 19.5 }, { distantaLichidarePct: -3 }]).d, 3); assert.equal(A.lichDin([{ lichidareDepasita: true }, { distantaLichidarePct: 5 }]).depasita, true); assert.equal(A.lichDin([]), null);
  assert.equal(A.tonLich(7.9), "pzR"); assert.equal(A.tonLich(14), "pzA"); assert.equal(A.tonLich(20), "");
  /* revizia Opus I4: verdictul ținut doar pentru ACELAȘI bot și cel mult 2 h */
  assert.equal(A.verdictValid({ botId: "1", verb: "ATENȚIE", la: T - 3600000 }, "1", T), true); assert.equal(A.verdictValid({ botId: "1", verb: "ATENȚIE", la: T - 3 * 3600000 }, "1", T), false); assert.equal(A.verdictValid({ botId: "2", verb: "ATENȚIE", la: T }, "1", T), false);
  assert.match(AS, /if \(!b \|\| !sem\) \{ if \(el\) \{ el\.hidden = true;/, "fără bot / ruta picată: verdictul de dinainte nu rămâne la vedere");
  assert.match(AS, /routeOk === false \? "Boții nu se pot citi acum/, "„Niciun bot pornit” doar când ruta a răspuns (revizia I8)");
  assert.doesNotMatch(AS, /body\.innerText/, "fără innerText pe tot corpul la 1,5 s (revizia I10)");
  assert.doesNotMatch(A.randuriKv('<img src=x onerror=1> 5 USDT'), /<img/, "escapat");
  assert.equal(A.ancora(5), "transform:translateX(-6px);"); assert.equal(A.ancora(95), "transform:translateX(calc(-100% + 6px));"); assert.equal(A.ancora(50), "");
  assert.ok(A.GLOSAR["din grid"] && A.GLOSAR["lichidarea la"] && A.GLOSAR["funding plătit"], "glosarul termenilor subliniați");
  assert.ok(ev.includes("click"), "clicurile stratului (data-pz-nav) se prind pe document");
  assert.match(AS, /if \(window\.__pzPauza\) return;/, "pauza pentru inventar");
  assert.doesNotMatch(AS, /innerHTML\s*=\s*[^;]*\+\s*(?!esc\()[a-zA-Z_.]+\.textContent/, "text din pagină pus în HTML fără esc()");
});
await test("(6) versiunile v100.151 peste tot și app.js neatins în logică (doar culorile)", () => {
  /* versiunea curentă (de la v100.152 nu mai e scrisă fix aici): aceeași în BUILD_INFO, index, sw, package.json, versiune.js - și cel puțin v100.151 */
  const V = JSON.parse(citeste("BUILD_INFO.json")).version, n = V.slice(1), m = V.match(/^v100\.(\d+)$/); assert.ok(m && +m[1] >= 151, V);
  assert.ok(HTML.includes(`content="${V}" name="app-version"`)); assert.ok(SW.includes(`const CACHE="crypto-radar-${V.replace(".", "-")}"`)); assert.equal(JSON.parse(citeste("package.json")).version, n + ".0");
  assert.ok(citeste("functions", "_shared", "versiune.js").includes(`VERSIUNE = "${V}"`));
  for (const c of VECHI) assert.ok(!APP.toLowerCase().includes(c.toLowerCase()), "culoare veche în app.js: " + c);
});

console.log(`\n${teste - picate}/${teste} verzi`);
if (picate) process.exit(1);
