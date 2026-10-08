// Proba v100.145 (08.10, el: „fa idei” după v100.144): (1) rândul cu bilanțul umplerilor din fereastră (perechi închise · deschise · ≈ profit
// din media Pionex pe pereche); (2) săgeata deschisă de peste o oră e galbenă (unde a rămas botul „agățat”); (3) alegerea „24 h” pe bot, nu globală.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js");
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
  const b1 = G.bilantUmpleri(U, { ordinePerechi: 62, gridProfitBrut: 6.34 }, false);
  assert.equal(b1.inchise, U.perechi); assert.equal(b1.deschise, deschise); assert.deepEqual(b1.pionex, { perechi: 62, grid: 6.34 });
  assert.equal(b1.text, "deduse din lumânări: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex: 62 de perechi · +6,3 USDT din grid");
  assert.equal(G.bilantUmpleri(U, { ordinePerechi: 62, gridProfitBrut: 6.34 }, true).text, "deduse din lumânări: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex pe tot botul: 62 de perechi · +6,3 USDT din grid");
  assert.equal(G.bilantUmpleri(U, { ordinePerechi: 0, gridProfitBrut: 0 }, false).text, "deduse din lumânări: " + U.perechi + " perechi închise · " + deschise + " deschise · Pionex: n-a dat încă perechile");
  assert.match(G.bilantUmpleri(U, { ordinePerechi: 3, gridProfitBrut: 0.03 }, false).text, /Pionex: 3 perechi · sub 0,1 USDT din grid$/, "sub 0,05 nu se rotunjește la „0,0”");
  const mic = { umpleri: [umpl(2, "B", 0.53, { inchisa: true }), umpl(3, "S", 0.54, { pereche: true }), umpl(5, "B", 0.51)], perechi: 1 };
  assert.equal(G.bilantUmpleri(mic, { ordinePerechi: 1, gridProfitBrut: 0.1 }, false).text, "deduse din lumânări: 1 pereche închisă · 1 deschisă · Pionex: 1 pereche · +0,1 USDT din grid");
  assert.equal(G.bilantUmpleri({ umpleri: [], perechi: 0 }, {}, false), null); assert.equal(G.bilantUmpleri(null, {}, false), null);
  const r = functie(APP, "renderTabloGrafic"); assert.match(r, /var bl=GraficBot\.bilantUmpleri\(oG\.umpleri,b,!oG\.fereastraPosibila\)/); assert.match(r, /<\/div>'\+\(bl\?'<p class="tbSub gbBilant"><b>▲▼ în fereastră:<\/b> '\+escapeHtml\(bl\.text\)\+'<\/p>':''\)\+ultHtml/, "primul rând sub grafic");
});
await test("(2) săgeata deschisă de peste o oră e galbenă (COL.warn), cea deschisă de curând gri, cea închisă verde; titlul spune „deschisă de N h”; legenda explică galbenul (și pe rândul scurt); intrareBot dă `acum` desenului", () => {
  const baza = { bare: B, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: ACUM }, C = G.COL;
  const veche = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(2, "B", 0.53)], perechi: 0 } })).svg;   // bara 2 = acum − 12 bare × 5 min = 1 h
  assert.ok(veche.includes('fill="' + C.warn + '" stroke="' + C.fond + '" stroke-width="1"/>'), "deschisă de o oră ⇒ galben"); assert.match(veche, /<title>cumpărare la 0\.5300 · [^·]+ · deschisă de 1 h<\/title>/);
  const noua = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(12, "B", 0.53)], perechi: 0 } })).svg;   // bara 12 = acum − 10 min
  assert.ok(noua.includes('fill="' + C.mut + '" stroke="' + C.fond + '" stroke-width="1"/>'), "deschisă de 10 min ⇒ gri"); assert.match(noua, /· încă deschisă<\/title>/);
  const amestec = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(2, "B", 0.53), umpl(2, "B", 0.52, { inchisa: true })], perechi: 1 } })).svg;
  assert.ok(amestec.includes('fill="' + C.good + '"'), "o pereche închisă în grup ⇒ verde bate galbenul");
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
