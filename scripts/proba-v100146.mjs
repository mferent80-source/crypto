// Proba v100.146 (08.10, el: „fa ideile și integrează mai mult Busola în ce spune piața”): (1) rândul umplerilor spune ultima pereche;
// (2) umplerile deduse din lumânările de 1 MINUT ale ferestrei botului (aduse separat, așezate pe lumânările graficului după timp);
// (3) vârsta scrisă lângă săgeata galbenă pe ecran lat; (4) Busola în „Ce spune piața acum”: starea + ce înseamnă pentru grid + intervalul ei
// față de gridul botului.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const GC = new Function(`${citeste("public", "lib", "grid-calcul.js")}; return GridCalcul;`)();
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.146 · ultima pereche, umplerile pe 1 minut, vârsta lângă săgeată, Busola în citire · proba\n");
const ACUM = Date.UTC(2026, 9, 8, 9, 0, 0), M5 = 300000, M1 = 60000;
const drum = [0.55, 0.54, 0.53, 0.52, 0.51, 0.50, 0.51, 0.52, 0.53, 0.54, 0.55, 0.54, 0.53, 0.52], B = drum.map((c, i) => ({ t: ACUM - (drum.length - i) * M5, o: i ? drum[i - 1] : c, h: Math.max(i ? drum[i - 1] : c, c) + 0.0005, l: Math.min(i ? drum[i - 1] : c, c) - 0.0005, c, v: 1 }));
const U = G.umpleri(B, { jos: 0.50, sus: 0.55, linii: 6, geo: false, p0: 0.55, pornit: B[0].t, dir: "long" });
const umpl = (ri, tip, p, extra) => Object.assign({ t: B[ri].t, ri, k: 0, p, tip, pereche: false, inchisa: false }, extra || {});
const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

await test("(1) rândul umplerilor spune ultima pereche închisă (ora barei ei) sau „nicio pereche încă”", () => {
  const ult = U.umpleri.filter((u) => u.pereche).reduce((m, u) => Math.max(m, u.t), 0); assert.ok(ult > 0);
  assert.match(G.bilantUmpleri(U, { ordinePerechi: 62, gridProfitBrut: 6.34 }, { eticheta: "5m", pornitInFereastra: true }).text, new RegExp(" deschise · ultima pereche la " + hm(ult) + " · Pionex: 62 de perechi"));
  const fara = { umpleri: [umpl(5, "B", 0.51)], perechi: 0 };
  assert.match(G.bilantUmpleri(fara, {}, { eticheta: "5m", pornitInFereastra: true }).text, /0 perechi închise · 1 deschisă · nicio pereche încă · Pionex: n-a dat/);
});
await test("(2) umplerile din lumânările de 1 MINUT: intrareBot le folosește când acoperă de la pornire (umpleriEticheta „1 min”), altfel pe lumânările graficului; săgețile se așază pe lumânarea graficului după TIMP, nu după indice", () => {
  // 5 min: prețul stă la 0,52 (nicio umplere); 1 min: în bara a 3-a de 5 min prețul atinge 0,50 și revine ⇒ o cumpărare + o vânzare văzute doar pe 1 min
  const plat5 = Array.from({ length: 12 }, (_, i) => ({ t: ACUM - (12 - i) * M5, o: 0.52, h: 0.5205, l: 0.5195, c: 0.52, v: 1 }));
  const b1 = []; for (let i = 0; i < 60; i++) { const t = ACUM - (60 - i) * M1, dip = i === 12 ? 0.505 : i === 13 ? 0.52 : null; const c = dip !== null ? dip : 0.52, o = i ? b1[i - 1].c : 0.52; b1.push({ t, o, h: Math.max(o, c) + 0.0005, l: Math.min(o, c) - 0.0005, c, v: 1 }); }
  const bot = { id: "1", pornitLa: plat5[0].t, gridJos: 0.50, gridSus: 0.55, directie: "LONG" }, brut = { buOrderData: { row: 6, initPrice: 0.52, bottom: 0.50, top: 0.55, gridType: "arithmetic" } };   // brut vine separat (tbStare.botBrut)
  const i5 = G.intrareBot({ bot, brut, bare: plat5, acum: ACUM, W: 1000 }); assert.equal(i5.umpleri.umpleri.length, 0, "pe 5 min nu se vede nimic"); assert.equal(i5.umpleriEticheta, null);
  const i1 = G.intrareBot({ bot, brut, bare: plat5, bare1m: b1, acum: ACUM, W: 1000 }); assert.equal(i1.umpleri.umpleri.length, 2, "pe 1 min se văd cumpărarea de la 0,51 (minutul 12 coboară la 0,5045) și vânzarea ei"); assert.equal(i1.umpleriEticheta, "1 min"); assert.equal(i1.umpleri.perechi, 1);
  const scurt = G.intrareBot({ bot, brut, bare: plat5, bare1m: b1.slice(20), acum: ACUM, W: 1000 }); assert.equal(scurt.umpleriEticheta, null, "lumânările de 1 min care nu acoperă de la pornire nu se folosesc"); assert.equal(scurt.umpleri.umpleri.length, 0);
  const d = G.desen(Object.assign({}, i1, { st: {}, niv: [], alerte: [], per: "24h" })), svg = d.svg, cw = d.harta.cw;
  const xs = [...svg.matchAll(/class="gbUmplere[^"]*"><title>[^<]*<\/title><polygon points="([\d.]+),/g)].map((m) => Number(m[1]));
  assert.ok(xs.length >= 1, "săgeți desenate"); const bi = Math.floor((xs[0] + 4.5) / cw); assert.equal(bi, 2, "umplerea din minutul 12 cade pe a 3-a lumânare de 5 min (indicele 2), nu pe indicele ei din șirul de 1 min: " + bi);
});
await test("(3) pe ecran lat vârsta stă lângă săgeata galbenă („×2 · 3 h” / „3 h” / „2 zile”); pe telefon doar în titlu", () => {
  const baza = { bare: B, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM + 3 * 3600000 }, C = G.COL;
  const doua = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(0, "B", 0.53), umpl(0, "B", 0.52)], perechi: 0 } })).svg;
  assert.ok(doua.includes('fill="' + C.warn + '"')); assert.match(doua, />×2 · 4 h<\/text>/, "două umpleri agățate de 4 h (bara 0 s-a închis acum 4 h și 5 min)");
  const una = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(0, "B", 0.53)], perechi: 0 } })).svg; assert.match(una, />4 h<\/text>/);
  const zile = G.desen(Object.assign({}, baza, { acum: ACUM + 2 * 86400000, umpleri: { umpleri: [umpl(0, "B", 0.53)], perechi: 0 } })).svg; assert.match(zile, />2 zile<\/text>/);
  const tel = G.desen(Object.assign({}, baza, { W: 390, ingust: true, umpleri: { umpleri: [umpl(0, "B", 0.53)], perechi: 0 } })).svg; assert.doesNotMatch(tel, />4 h<\/text>/); assert.match(tel, /deschisă de cel puțin 4 h<\/title>/);
  const proaspete = G.desen(Object.assign({}, baza, { acum: ACUM, umpleri: { umpleri: [umpl(12, "B", 0.53), umpl(12, "B", 0.52)], perechi: 0 } })).svg; assert.match(proaspete, />×2<\/text>/); assert.doesNotMatch(proaspete, / h<\/text>/);
});
await test("(4) Busola în „Ce spune piața acum”: rândul stării (ca până acum) + „Gridul, după Busola” (cât a pierdut un grid în regimul de acum, cu o zecimală, canalul) + „Intervalul Busolei (4h)” față de gridul botului (mai îngust cu peste 10% ⇒ atenție); citirea le așază după rândul Busolei", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo };
  vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
  const rez = { la: Date.now() - 20 * 60000, monede: { MET: { perp4h: "nu-stiu", fisa4h: { jos: 0.3982, sus: 0.6414, linii: 17 } } }, grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.0094, miscare: -0.0113, futures: { canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0082, oricand: -0.0095, miscare: -0.0114 }, canal4h: "+4,2/−3,9 ATR" }, perp: { bilant: { verdict: "prea puține" } } };
  ctx.Busola.rezumat = () => rez; ctx.tbStare = { bot: { id: "9", baza: "MET.PERP", quote: "USDT", directie: "SHORT", gridJos: 0.46, gridSus: 0.50 }, graficInterval: "5M", directie: null };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = () => "MET_USDT_PERP|SHORT"; ctx.tbCheieBusola = () => "MET_USDT_PERP"; ctx.tbPazaKv = { boti: {} };
  const src = "var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + ["tbTf", "tbPretScurt", "tbRotPct", "tbCitireExtra"].map((n) => functie(APP, n)).join("\n");
  vm.runInContext(src, ctx);
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {});
  assert.equal(x.busola.ce, "Busola, pe 4h"); assert.match(x.busola.text, /^nimic neobișnuit · măsurat acum 20 min$/);
  assert.equal(x.busolaGrid.ce, "Gridul, după Busola"); assert.equal(x.busolaGrid.stare, "info"); assert.equal(x.busolaGrid.text, "un grid oarecare a ieșit pe minus (−1,0% pe episod) · futures ±2×ATR", "o zecimală ROTUNJITĂ (−0,950 ⇒ −1,0), fără prefixul „Busola, pe 4h: ” și fără starea repetată din rândul de deasupra (revizia Opus)");
  assert.equal(x.busolaInterval.ce, "Intervalul Busolei (4h)"); assert.equal(x.busolaInterval.stare, "atentie"); assert.equal(x.busolaInterval.text, "jos 0.39820 · sus 0.64140 · 17 linii · intervalul tău e cu 84% mai îngust decât al Busolei (al ei a pierdut cel mai puțin, pe spot)");
  rez.monede.MET.perp4h = "miscare"; const y = ctx.tbCitireExtra(ctx.tbStare.bot, {}); assert.equal(y.busolaGrid.stare, "atentie"); assert.match(y.busolaGrid.text, /^aici gridul a pierdut cel mai mult \(−1,1% pe episod\) · futures ±2×ATR$/);
  ctx.tbStare.bot.gridJos = 0.40; ctx.tbStare.bot.gridSus = 0.64; assert.equal(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busolaInterval.stare, "info", "cam la fel de larg ⇒ info");
  delete rez.monede.MET.fisa4h; assert.equal(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busolaInterval, null, "fără fișă ⇒ fără rând");
  const d = functie(APP, "tbDeseneazaCitire"); assert.equal((d.match(/busolaRanduri\(\)/g) || []).length, 2, "după rândul Busolei, în amândouă locurile (v100.147: prin ajutorul busolaRanduri)");
});
await test("(2b) pagina: tbAdu1m aduce lumânările de 1 min de la pornire − 2 h (pagini de 500, cel mult 3), le ține 2 minute, redesenează o dată când vin; botul mai vechi de 25 h ⇒ nu cere; renderTabloGrafic le dă lui intrareBot și rândului eticheta „1 min”", async () => {
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /tbAdu1m\(b\)/); assert.match(r, /bare1m:tbBare1m\(b\)/); assert.match(r, /eticheta:oG\.umpleriEticheta\|\|TB_PERIOADE\[tbTf\(\)\]\.eticheta/);
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, encodeURIComponent, GridCalcul: GC, randari: 0, cereri: [] };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbPanouVizibil = () => true; ctx.renderTabloGrafic = () => { ctx.randari++; };
  const acum = Date.now(), pornit = acum - 3 * 3600000; ctx.tbStare = { bot: { id: "1", baza: "MET.PERP", quote: "USDT", pornitLa: pornit } };
  ctx.getJSON = async (u) => { ctx.cereri.push(u); const end = /endTime=(\d+)/.test(u) ? Number(RegExp.$1) : acum; const l = []; for (let i = 0; i < 500; i++) { const t = end - i * M1; l.push({ time: t, open: "0.52", high: "0.521", low: "0.519", close: "0.52", volume: "1" }); } return { data: { klines: l } }; };
  const src = APP.match(/var tbUm1m=[^\n]*\n/)[0] + APP.match(/var TB_UM1M_MS=[^\n]*\n/)[0] + functie(APP, "tbAdu1m") + "\n" + functie(APP, "tbBare1m");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.tbAdu1m(ctx.tbStare.bot); for (let i = 0; i < 50 && ctx.tbUm1m.inLucru; i++) await new Promise((r) => setTimeout(r, 20)); await new Promise((r) => setTimeout(r, 30));
  assert.equal(ctx.cereri.length, 1, "o pagină de 500 acoperă 5 h"); assert.match(ctx.cereri[0], /interval=1M&limit=500$/); assert.equal(ctx.randari, 1); assert.ok(ctx.tbUm1m.bare && ctx.tbUm1m.bare.length === 499 && ctx.tbUm1m.bare[0].t < ctx.tbUm1m.bare[1].t, "sortate crescător, fără minutul în formare (GridCalcul.bare îl scoate; prețul live îl pune la loc)");
  assert.equal(ctx.tbBare1m(ctx.tbStare.bot).length, 499); ctx.tbAdu1m(ctx.tbStare.bot); await new Promise((r) => setTimeout(r, 30)); assert.equal(ctx.cereri.length, 1, "în 2 minute nu cere iar");
  ctx.tbStare.bot = { id: "2", baza: "MET.PERP", quote: "USDT", pornitLa: acum - 30 * 3600000 }; ctx.tbAdu1m(ctx.tbStare.bot); await new Promise((r) => setTimeout(r, 30)); assert.equal(ctx.cereri.length, 1, "bot de 30 h: prea lung pentru 1 min"); assert.equal(ctx.tbBare1m(ctx.tbStare.bot), null);
  ctx.tbStare.bot = { id: "3", baza: "MET.PERP", quote: "USDT", pornitLa: acum - 12 * 3600000 }; ctx.tbAdu1m(ctx.tbStare.bot); for (let i = 0; i < 50 && ctx.tbUm1m.inLucru; i++) await new Promise((r) => setTimeout(r, 20)); await new Promise((r) => setTimeout(r, 30));
  assert.equal(ctx.cereri.length, 3, "bot de 12 h ⇒ 2 pagini (14 h ≤ 16,6 h)"); assert.match(ctx.cereri[2], /endTime=\d+/); assert.equal(ctx.tbUm1m.bare.length, 999);
});
await test("(R1) revizia Opus: vârsta umplerilor de 1 min nu depinde de intervalul graficului (umpleriPas), „ultima pereche” cu ziua când nu e azi și „în bara de la” pe bare de 1 h+, eticheta de lângă săgeată nu intră în margine (text-anchor=end aproape de dreapta)", () => {
  const C = G.COL, H4 = 4 * 3600000, b4 = Array.from({ length: 12 }, (_, i) => ({ t: ACUM - 3 * 3600000 - (11 - i) * H4, o: 0.52, h: 0.53, l: 0.51, c: 0.52, v: 1 }));
  // umplere de 1 min deschisă acum 6 h, desenată pe graficul de 4h: vârsta rămâne 6 h, nu „2 h” (acum − (u.t + 4 h))
  const u = { t: ACUM - 6 * 3600000, ri: 0, k: 0, p: 0.52, tip: "B", pereche: false, inchisa: false };
  const cuPas = G.desen({ bare: b4, W: 1000, st: {}, niv: [], alerte: [], per: "30z", acum: ACUM, umpleri: { umpleri: [u], perechi: 0 }, umpleriPas: 60000 }).svg;
  assert.match(cuPas, />5 h<\/text>/, "6 h − 1 min ⇒ „cel puțin 5 h” (margine de jos cu pasul de 1 min)"); assert.match(cuPas, /deschisă de cel puțin 5 h<\/title>/);
  const faraPas = G.desen({ bare: b4, W: 1000, st: {}, niv: [], alerte: [], per: "30z", acum: ACUM, umpleri: { umpleri: [u], perechi: 0 } }).svg; assert.match(faraPas, />2 h<\/text>/, "fără umpleriPas, pasul graficului (4 h)");
  const bot = { id: "1", pornitLa: B[0].t, gridJos: 0.50, gridSus: 0.55, directie: "LONG" }, brut = { buOrderData: { row: 6, initPrice: 0.52, bottom: 0.50, top: 0.55, gridType: "arithmetic" } };
  const b1 = []; for (let i = 0; i < 70; i++) { const t = ACUM - (70 - i) * M1; b1.push({ t, o: 0.52, h: 0.5205, l: 0.5195, c: 0.52, v: 1 }); }
  assert.equal(G.intrareBot({ bot, brut, bare: B, bare1m: b1, acum: ACUM, W: 1000 }).umpleriPas, 60000); assert.equal(G.intrareBot({ bot, brut, bare: B, acum: ACUM, W: 1000 }).umpleriPas, null);
  const ult = U.umpleri.filter((x) => x.pereche).reduce((m, x) => Math.max(m, x.t), 0), ieri = ult + 86400000, hmz = (t) => { const d = new Date(t); return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0") + " " + hm(t); };
  assert.match(G.bilantUmpleri(U, {}, { eticheta: "5m", pornitInFereastra: true, acum: ACUM, pas: M5 }).text, new RegExp(" · ultima pereche la " + hm(ult) + " · "), "azi: doar ora");
  assert.match(G.bilantUmpleri(U, {}, { eticheta: "5m", pornitInFereastra: true, acum: ieri, pas: M5 }).text, new RegExp(" · ultima pereche la " + hmz(ult) + " · "), "nu e azi: cu ziua");
  assert.match(G.bilantUmpleri(U, {}, { eticheta: "1h", pornitInFereastra: true, acum: ACUM, pas: 3600000 }).text, new RegExp(" · ultima pereche în bara de la " + hm(ult) + " · "), "pe bare de 1 h+: ora barei, spus");
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /pas:oG\.umpleriPas\|\|\(bare\.length>1\?bare\[1\]\.t-bare\[0\]\.t:0\),acum:Date\.now\(\)/);
  const dreapta = G.desen({ bare: B, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM + 3 * 3600000, umpleri: { umpleri: [umpl(13, "B", 0.52), umpl(13, "B", 0.53)], perechi: 0 } }).svg;
  assert.match(dreapta, /<text x="[\d.]+" y="[\d.]+" text-anchor="end" font-size="10\.5"[^>]*>×2 · 3 h<\/text>/, "lângă marginea dreaptă eticheta se întoarce spre stânga (bara 13 s-a închis acum 3 h)");
});
await test("(R2) revizia Opus: procentele Busolei se rotunjesc (−0,999% ⇒ −1,0%), nu se taie; pragul de atenție = regula comparației (exact −10% ⇒ „cam la fel” ⇒ info); „Gridul, după Busola” nu repetă starea din rândul de deasupra", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo };
  vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
  const rez = { la: Date.now() - 20 * 60000, monede: { MET: { perp4h: "nu-stiu", fisa4h: { jos: 0.40, sus: 0.50, linii: 11 } } }, grid: { interval: "4h", canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0081, oricand: -0.00999, miscare: -0.0113, futures: { canal: "±2×ATR", dovedit: false, miscareDovedita: true, liniste: -0.0082, oricand: -0.00999, miscare: -0.0114 }, canal4h: "+4,2/−3,9 ATR" }, perp: { bilant: { verdict: "prea puține" } } };
  ctx.Busola.rezumat = () => rez; ctx.tbStare = { bot: { id: "9", baza: "MET.PERP", quote: "USDT", directie: "SHORT", gridJos: 0.41, gridSus: 0.50 }, graficInterval: "5M", directie: null };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbCheieDir = () => "MET_USDT_PERP|SHORT"; ctx.tbCheieBusola = () => "MET_USDT_PERP"; ctx.tbPazaKv = { boti: {} };
  vm.runInContext("var TB_PERIOADE=" + APP.match(/var TB_PERIOADE=(\{[^\n]*\});/)[1] + ";\n" + ["tbTf", "tbPretScurt", "tbRotPct", "tbCitireExtra"].map((n) => functie(APP, n)).join("\n"), ctx);
  const x = ctx.tbCitireExtra(ctx.tbStare.bot, {});
  assert.equal(x.busolaGrid.text, "un grid oarecare a ieșit pe minus (−1,0% pe episod) · futures ±2×ATR", "rotunjit, fără „nimic neobișnuit — ” repetat");
  assert.equal(ctx.tbRotPct("−0,299% · +0,045% · 12,34%"), "−0,3% · +0,0% · 12,3%");
  assert.equal(x.busolaInterval.stare, "info", "0,09 / 0,10 − 1 = −10% ⇒ „cam la fel” ⇒ info, nu galben"); assert.match(x.busolaInterval.text, /cam la fel de larg/);
  ctx.tbStare.bot.gridJos = 0.42; assert.equal(ctx.tbCitireExtra(ctx.tbStare.bot, {}).busolaInterval.stare, "atentie", "−20% ⇒ atenție");
});
await test("(R3) revizia Opus: o aducere picată (503) păstrează lumânările de 1 min bune și reîncearcă în 30 s, nu le aruncă", async () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, encodeURIComponent, GridCalcul: GC, randari: 0, cereri: 0, cade: false };
  ctx.TabloBot = { simboluri: () => ({ pionex: "MET_USDT_PERP" }) }; ctx.tbPanouVizibil = () => true; ctx.renderTabloGrafic = () => { ctx.randari++; };
  const acum = Date.now(); ctx.tbStare = { bot: { id: "1", baza: "MET.PERP", quote: "USDT", pornitLa: acum - 3 * 3600000 } };
  ctx.getJSON = async () => { ctx.cereri++; if (ctx.cade) throw new Error("HTTP 503"); const l = []; for (let i = 0; i < 500; i++) l.push({ time: acum - i * M1, open: "0.52", high: "0.521", low: "0.519", close: "0.52", volume: "1" }); return { data: { klines: l } }; };
  vm.createContext(ctx); vm.runInContext(APP.match(/var tbUm1m=[^\n]*\n/)[0] + APP.match(/var TB_UM1M_MS=[^\n]*\n/)[0] + functie(APP, "tbAdu1m") + "\n" + functie(APP, "tbBare1m"), ctx);
  const gata = async () => { for (let i = 0; i < 50 && ctx.tbUm1m.inLucru; i++) await new Promise((r) => setTimeout(r, 20)); await new Promise((r) => setTimeout(r, 30)); };
  ctx.tbAdu1m(ctx.tbStare.bot); await gata(); assert.equal(ctx.tbUm1m.bare.length, 499);
  ctx.cade = true; ctx.tbUm1m.la = 0; ctx.tbAdu1m(ctx.tbStare.bot); await gata(); assert.equal(ctx.cereri, 2); assert.equal(ctx.tbUm1m.bare.length, 499, "lumânările bune rămân"); assert.ok(Date.now() - ctx.tbUm1m.la >= ctx.TB_UM1M_MS - 31000, "reîncercare în ~30 s, nu în 2 min");
  assert.equal(ctx.randari, 1, "fără redesen la eșec");
  const first = ctx.tbStare.bot; ctx.tbStare.bot = { id: "2", baza: "MET.PERP", quote: "USDT", pornitLa: acum - 2 * 3600000 }; ctx.tbUm1m.la = 0; ctx.tbAdu1m(ctx.tbStare.bot); await gata(); assert.equal(ctx.tbBare1m(ctx.tbStare.bot), null, "alt bot picat ⇒ nimic, nu lumânările celuilalt"); assert.equal(ctx.tbBare1m(first), null);
});
await test("(E) versiunea de la v100.146 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[6-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[6-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[6-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[6-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[6-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[6-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[6-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
