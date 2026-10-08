// Proba v100.145 (08.10, el: „fa idei” după v100.144): (1) rândul cu bilanțul umplerilor (perechile deduse · deschise, lângă cifrele REALE
// Pionex, fără înmulțiri); (2) săgeata deschisă de peste o oră e galbenă (unde a rămas botul „agățat”); (3) alegerea „24 h” pe bot, nu globală.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.145 · bilanțul umplerilor, săgeata agățată, „24 h” pe bot · proba\n");
const ACUM = Date.UTC(2026, 9, 8, 9, 0, 0), M5 = 300000;
const drum = [0.55, 0.54, 0.53, 0.52, 0.51, 0.50, 0.51, 0.52, 0.53, 0.54, 0.55, 0.54, 0.53, 0.52], B = drum.map((c, i) => ({ t: ACUM - (drum.length - i) * M5, o: i ? drum[i - 1] : c, h: Math.max(i ? drum[i - 1] : c, c) + 0.0005, l: Math.min(i ? drum[i - 1] : c, c) - 0.0005, c, v: 1 }));
const U = G.umpleri(B, { jos: 0.50, sus: 0.55, linii: 6, geo: false, p0: 0.55, pornit: B[0].t, dir: "long" });
const umpl = (ri, tip, p, extra) => Object.assign({ t: B[ri].t, ri, k: 0, p, tip, pereche: false, inchisa: false }, extra || {});

await test("(1) bilantUmpleri pe umpleri REALE: perechile deduse (închise = U.perechi, deschise) lângă cifrele REALE Pionex (perechi, profit din grid, o zecimală) - fără înmulțiri (din POZĂ: „≈ +11,5” la un bot cu +6,7); bot mai vechi decât fereastra ⇒ „pe tot botul”; singularul; fără umpleri ⇒ null; rândul e sub grafic", () => {
  const deschise = U.umpleri.filter((u) => !u.pereche && !u.inchisa).length; assert.ok(U.perechi >= 4 && deschise >= 2, U.perechi + " / " + deschise);
  const IN = { eticheta: "5m", pornitInFereastra: true }, b1 = G.bilantUmpleri(U, { ordinePerechi: 62, gridProfitBrut: 6.34 }, IN);
  assert.equal(b1.inchise, U.perechi); assert.equal(b1.deschise, deschise); assert.deepEqual(b1.pionex, { perechi: 62, grid: 6.34 });
  // revizia Opus (3, 6): rândul spune INTERVALUL și de unde numără; „Pionex pe tot botul” doar când botul e mai vechi decât fereastra
  assert.equal(b1.text, "deduse din lumânările de 5m, de la pornire: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex: 62 de perechi · +6,3 USDT din grid");
  assert.equal(G.bilantUmpleri(U, { ordinePerechi: 62, gridProfitBrut: 6.34 }, { eticheta: "1h", pornitInFereastra: false }).text, "deduse din lumânările de 1h, de la începutul ferestrei: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex pe tot botul: 62 de perechi · +6,3 USDT din grid");
  assert.equal(G.bilantUmpleri(U, { ordinePerechi: 0, gridProfitBrut: 0 }, IN).text, "deduse din lumânările de 5m, de la pornire: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex: n-a dat încă perechile");
  assert.match(G.bilantUmpleri(U, { ordinePerechi: 3, gridProfitBrut: 0.03 }, IN).text, /Pionex: 3 perechi · aproape 0 USDT din grid$/, "sub 0,05 nu se rotunjește la „0,0” și nu minte cu semnul");
  assert.match(G.bilantUmpleri(U, { ordinePerechi: 3, gridProfitBrut: -0.03 }, IN).text, /aproape 0 USDT din grid$/);
  const mic = { umpleri: [umpl(2, "B", 0.53, { inchisa: true }), umpl(3, "S", 0.54, { pereche: true }), umpl(5, "B", 0.51)], perechi: 1 };
  assert.equal(G.bilantUmpleri(mic, { ordinePerechi: 1, gridProfitBrut: 0.1 }, {}).text, "deduse din lumânări, de la începutul ferestrei: 1 pereche închisă · 1 deschisă · Pionex pe tot botul: 1 pereche · +0,1 USDT din grid");
  // revizia Opus (5): umplerile din afara cadrului graficului (nu se desenează) se spun, nu se ascund
  assert.match(G.bilantUmpleri(mic, { ordinePerechi: 1, gridProfitBrut: 0.1 }, { eticheta: "5m", pornitInFereastra: true, lo: 0.515, hi: 0.535 }).text, /1 pereche închisă · 1 deschisă \(2 în afara graficului\) · Pionex:/);
  assert.equal(G.bilantUmpleri({ umpleri: [], perechi: 0 }, {}, IN), null); assert.equal(G.bilantUmpleri(null, {}, IN), null);
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /var bl=GraficBot\.bilantUmpleri\(oG\.umpleri,b,\{eticheta:TB_PERIOADE\[tbTf\(\)\]\.eticheta,pornitInFereastra:oG\.pornitInFereastra,lo:d\.harta\.lo,hi:d\.harta\.hi\}\)/); assert.match(r, /<\/div>'\+\(bl\?'<p class="tbSub gbBilant"><b>▲▼ umpleri:<\/b> '\+escapeHtml\(bl\.text\)\+'<\/p>':''\)\+ultHtml/, "primul rând sub grafic");
  assert.match(CSS, /#tabloubot \.gbBilant\{[^}]*font-size:12\.5px/, "aceeași literă ca vecinii");
});
await test("(R2) revizia Opus 🟡: botul mai vechi decât fereastra ⇒ starea grilei pornește de la deschiderea primei bare (nu de la prețul de pornire) - fără umpleri fantomă pe prima bară; intrareBot spune pornitInFereastra", () => {
  const plat = Array.from({ length: 10 }, (_, i) => ({ t: ACUM - (10 - i) * M5, o: 0.52, h: 0.5205, l: 0.5195, c: 0.52, v: 1 }));
  const vechi = G.umpleri(plat, { jos: 0.50, sus: 0.55, linii: 6, geo: false, p0: 0.56, pornit: plat[0].t - 3 * 86400000, dir: "long" });
  assert.equal(vechi.umpleri.length, 0, "bot pornit acum 3 zile la 0,56, fereastra plată la 0,52 ⇒ nicio umplere fantomă: " + JSON.stringify(vechi.umpleri.map((u) => u.p)));
  const nou = G.umpleri(plat, { jos: 0.50, sus: 0.55, linii: 6, geo: false, p0: 0.56, pornit: plat[0].t, dir: "long" });
  assert.ok(nou.umpleri.length >= 3, "bot pornit pe prima bară la 0,56 ⇒ cumpărările de la 0,55 în jos se umplu real pe drumul până la 0,52: " + nou.umpleri.length);
  assert.equal(G.intrareBot({ bot: { id: "1", pornitLa: ACUM - 5 * 3600000, gridJos: 0.5, gridSus: 0.55 }, bare: B, acum: ACUM, W: 1000 }).pornitInFereastra, false, "pornit cu 5 h înainte de prima bară");
  assert.equal(G.intrareBot({ bot: { id: "1", pornitLa: B[3].t, gridJos: 0.5, gridSus: 0.55 }, bare: B, acum: ACUM, W: 1000 }).pornitInFereastra, true);
  assert.equal(G.intrareBot({ bot: { id: "1", gridJos: 0.5, gridSus: 0.55 }, bare: B, acum: ACUM, W: 1000 }).pornitInFereastra, false, "fără oră de pornire");
});
await test("(2) săgeata deschisă de peste o oră e galbenă (COL.warn), cea deschisă de curând gri, cea închisă verde; vârsta se măsoară de la ÎNCHIDEREA barei („de cel puțin N h”, bara curentă niciodată galbenă, pe 1z în zile); galbenul bate verdele (inelul rămâne semnul perechii închise); legenda; intrareBot dă `acum`", () => {
  const baza = { bare: B, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM }, C = G.COL;
  const veche = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(0, "B", 0.53)], perechi: 0 } })).svg;   // bara 0 s-a închis acum 65 min
  assert.ok(veche.includes('fill="' + C.warn + '" stroke="' + C.fond + '" stroke-width="1"/>'), "închisă bara acum 65 min ⇒ galben"); assert.match(veche, /<title>cumpărare la 0\.5300 · [^·]+ · deschisă de cel puțin 1 h<\/title>/);
  const noua = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(12, "B", 0.53)], perechi: 0 } })).svg;   // bara 12 s-a închis acum 5 min
  assert.ok(noua.includes('fill="' + C.mut + '" stroke="' + C.fond + '" stroke-width="1"/>'), "deschisă de 5 min ⇒ gri"); assert.match(noua, /· încă deschisă<\/title>/);
  // revizia Opus 🔴: pe 4h o umplere de pe bara CURENTĂ (deschisă de 3 h) nu e „de 3 h”; cea de pe bara anterioară e „de cel puțin 2 h” abia după ce bara s-a închis
  const H4 = 4 * 3600000, b4 = Array.from({ length: 12 }, (_, i) => ({ t: ACUM - 3 * 3600000 - (11 - i) * H4, o: 0.52, h: 0.53, l: 0.51, c: 0.52, v: 1 })), baza4 = Object.assign({}, baza, { bare: b4, per: "30z" });
  const cur = G.desen(Object.assign({}, baza4, { umpleri: { umpleri: [{ t: b4[11].t, ri: 11, k: 0, p: 0.52, tip: "B", pereche: false, inchisa: false }], perechi: 0 } })).svg;
  assert.ok(cur.includes('fill="' + C.mut + '"'), "bara curentă de 4 h ⇒ gri"); assert.match(cur, /· încă deschisă<\/title>/);
  const ant = G.desen(Object.assign({}, baza4, { umpleri: { umpleri: [{ t: b4[10].t, ri: 10, k: 0, p: 0.52, tip: "B", pereche: false, inchisa: false }], perechi: 0 } })).svg;
  assert.ok(ant.includes('fill="' + C.warn + '"'), "bara anterioară, închisă acum 3 h ⇒ galben"); assert.match(ant, /· deschisă de cel puțin 3 h<\/title>/);
  const ZI = 86400000, bz = Array.from({ length: 10 }, (_, i) => ({ t: ACUM - 5 * 3600000 - (9 - i) * ZI, o: 0.52, h: 0.53, l: 0.51, c: 0.52, v: 1 }));
  const zi = G.desen(Object.assign({}, baza, { bare: bz, per: "200z", umpleri: { umpleri: [{ t: bz[6].t, ri: 6, k: 0, p: 0.52, tip: "B", pereche: false, inchisa: false }], perechi: 0 } })).svg;
  assert.match(zi, /· deschisă de cel puțin 2 zile<\/title>/, "pe 1z vârsta în zile (bara 6 s-a închis acum 2 zile și 5 h)");
  // revizia Opus (4): galbenul bate verdele - culoarea spune cea mai rea stare deschisă; inelul rămâne semnul perechii închise
  const amestec = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(0, "B", 0.53), umpl(0, "B", 0.52, { inchisa: true })], perechi: 1 } })).svg;
  assert.match(amestec, /class="gbUmplere gbPereche"><title>1 din 2 umpleri cu perechea închisă\n[^<]*<\/title><polygon points="[^"]+" fill="#[0-9a-fA-F]{6}"/); assert.ok(amestec.includes('fill="' + C.warn + '" stroke="' + C.fond + '" stroke-width="1"/><circle'), "galben + inel");
  const d = G.desen(Object.assign({}, baza, { umpleri: U })); assert.match(d.legenda, /verde = pereche închisă · gri = deschisă · galben = deschisă de peste o oră/);
  assert.match(G.desen(Object.assign({}, baza, { simplu: true, umpleri: U })).legenda, /▲▼ umpleri: verde = pereche închisă \(\d+\) · gri = deschisă · galben = de peste o oră/);
  assert.equal(G.intrareBot({ bot: { id: "1", gridJos: 0.5, gridSus: 0.55 }, bare: B, acum: ACUM, W: 1000 }).acum, ACUM);
});
await test("(3) alegerea „24 h” e pe bot: comutată pe botul 1 nu atinge botul 2; se ține în tabloBotFereastra_v2 ca obiect {id: 1}; valoarea veche („1”) nu mai contează", () => {
  assert.match(APP, /TB_FER_CHEIE="tabloBotFereastra_v2"/);
  const mem = new Map(), ctx = { console, JSON, Object, String, Number, Array, Math, randari: 0 };
  ctx.tbStare = { bot: { id: "1" } }; ctx.tbCiteste = (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null); ctx.tbScrie = (k, v) => { mem.set(k, JSON.stringify(v)); return true; }; ctx.renderTabloGrafic = () => { ctx.randari++; };
  vm.createContext(ctx); vm.runInContext('var TB_FER_CHEIE="tabloBotFereastra_v2";\n' + functie(APP, "tbFereastraToataE") + "\n" + functie(APP, "tbFereastraToata"), ctx);
  mem.set("tabloBotFereastra_v2", JSON.stringify("1")); assert.equal(ctx.tbFereastraToataE(), false, "valoarea veche nu e o alegere pe bot");
  ctx.tbFereastraToata(); assert.equal(ctx.tbFereastraToataE(), true); assert.equal(ctx.randari, 1); assert.deepEqual(JSON.parse(mem.get("tabloBotFereastra_v2")), { 1: 1 });
  ctx.tbStare.bot = { id: "2" }; assert.equal(ctx.tbFereastraToataE(), false, "botul 2 rămâne pe fereastra lui"); ctx.tbFereastraToata(); assert.deepEqual(JSON.parse(mem.get("tabloBotFereastra_v2")), { 1: 1, 2: 1 });
  ctx.tbStare.bot = { id: "1" }; assert.equal(ctx.tbFereastraToataE(), true); ctx.tbFereastraToata(); assert.equal(ctx.tbFereastraToataE(), false); assert.deepEqual(JSON.parse(mem.get("tabloBotFereastra_v2")), { 2: 1 });
  ctx.tbStare.bot = null; assert.equal(ctx.tbFereastraToataE(), false); ctx.tbFereastraToata(); assert.equal(ctx.randari, 3, "fără bot nu se comută și nu se redesenează");
});
await test("(E) versiunea de la v100.145 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[5-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[5-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[5-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[5-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[5-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[5-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[5-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
