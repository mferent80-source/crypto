// Proba v100.280 / colector v101.152 (30.10, el: „fă tot” - cele 3 idei de după analiza comportamentală):
// (1) frâna contului cu pragul „boți porniți azi” (implicit 7) + contorul zilei pe Acasă (boți / la rând / zi / 7 zile, pe pragurile lui);
// (2) treapta timpurie a alertei de bandă - din același tabel al lui (primul prag cu sub jumătate întoarse), înaintea regulii de închidere;
// (3) „Grilele au prins / poziția a dat” pe 7 zile în „Boții tăi”.
//   node scripts/proba-v100280.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)(); globalThis.GridProba = GP;
const JT = new Function(`${lib("jurnal-trade.js")}; return JurnalTrade;`)(); globalThis.JurnalTrade = JT;
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(G, GP, JT); globalThis.Obiceiuri = OB;
const DI = new Function(`${lib("disciplina.js")}; return Disciplina;`)();
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.280 · FRÂNA ZILEI · proba\n");
const ORA = 3600000, T = (s) => Date.parse(s);
const ACUM = T("2026-10-30T18:00:00Z");   // 20:00 ora României; ziua începe la 22:00Z pe 29.10
// boți închiși: pornit / închis / net
const tr = (id, pornit, inchis, net) => ({ id, moneda: "PARTI", pornit: T(pornit), inchis: T(inchis), net, rezultat: net, comisioane: 0, funding: 0 });

await test("(1) frâna: boții PORNIȚI azi (ziua României) - închiși și încă deschiși; ieri nu; pragul implicit 7 și al lui", () => {
  assert.deepEqual(OB.praguriFrana(null), { zi: 20, sapt: 60, rand: 3, boti: 7 });
  assert.equal(OB.praguriFrana({ zi: 50, sapt: 100, rand: 4, boti: 5 }).boti, 5);
  assert.equal(OB.praguriFrana({ zi: 50, sapt: 100, rand: 4 }).boti, 7, "configurație veche, fără boti ⇒ implicit");
  const inch = [
    tr("a", "2026-10-29T21:30:00Z", "2026-10-29T23:00:00Z", 1),   // pornit 29.10 23:30 RO ⇒ ieri
    tr("b", "2026-10-29T22:10:00Z", "2026-10-29T22:20:00Z", 2),   // pornit 30.10 00:10 RO ⇒ azi
    tr("c", "2026-10-30T08:00:00Z", "2026-10-30T08:05:00Z", 1),
    tr("d", "2026-10-30T09:00:00Z", "2026-10-30T09:05:00Z", 1),
    tr("e", "2026-10-30T10:00:00Z", "2026-10-30T10:05:00Z", 1),
    tr("f", "2026-10-30T11:00:00Z", "2026-10-30T11:05:00Z", 1),
  ];
  const desch = [{ activ: true, pornitLa: T("2026-10-30T12:00:00Z"), profitTotal: 0.5 }, { activ: true, pornitLa: T("2026-10-28T12:00:00Z"), profitTotal: 0.5 }, { activ: false, pornitLa: T("2026-10-30T13:00:00Z") }];
  const f6 = OB.frana({ trades: inch, deschise: desch, acum: ACUM });
  assert.equal(f6.pornitiAzi, 6, "b, c, d, e, f + deschisul de azi; nu a, nu cel de pe 28.10, nu cel oprit");
  assert.ok(!f6.depasit.some((d) => d.cod === "boti"), "6 < 7");
  assert.match(f6.text, /, 6 din 7 boți porniți azi\.$/);
  const f7 = OB.frana({ trades: inch, deschise: desch.concat([{ activ: true, pornitLa: T("2026-10-30T14:00:00Z"), profitTotal: 1 }]), acum: ACUM });
  assert.equal(f7.pornitiAzi, 7); assert.equal(f7.activa, true);
  assert.deepEqual(f7.depasit.map((d) => d.cod), ["boti"]);
  assert.equal(f7.depasit[0].text, "7 boți porniți azi (pragul: 7)");
  assert.match(f7.text, /^Frâna e trasă: 7 boți porniți azi \(pragul: 7\); n-aș mai porni boți azi\.$/);
  // pragul lui
  assert.ok(OB.frana({ trades: inch, deschise: desch, acum: ACUM, praguri: { zi: 20, sapt: 60, rand: 3, boti: 5 } }).depasit.some((d) => d.cod === "boti"));
  // boți fără ora pornirii (probele vechi): nu se numără
  assert.equal(OB.frana({ trades: [{ inchis: ACUM - ORA, net: -1 }], acum: ACUM }).pornitiAzi, 0);
});

await test("(1) frâna pe istorie: boții încă deschiși în clipa pornirii se numără ⇒ al 8-lea bot al zilei e „oprit”", () => {
  // 8 boți porniți azi la o oră distanță, toți ținuți până seara (se suprapun): înainte de v100.280 frâna i-ar fi văzut 0 porniți
  const l = Array.from({ length: 8 }, (_, i) => tr("s" + i, new Date(T("2026-10-30T06:00:00Z") + i * ORA).toISOString(), "2026-10-30T17:00:00Z", i === 7 ? -50 : 1));
  const ist = OB.franaIstoric(l, { zi: 1000, sapt: 1000, rand: 99, boti: 7 });
  assert.equal(ist.sarite, 1, "doar al 8-lea"); assert.equal(ist.economisit, 50);
  const fara = OB.franaIstoric(l, { zi: 1000, sapt: 1000, rand: 99, boti: 99 });
  assert.equal(fara.sarite, 0);
});

await test("(1) mesajul de pe Discord spune pragul de boți; ruta păstrează `boti` (opțional) și refuză o valoare stricată", async () => {
  const f7 = OB.frana({ trades: Array.from({ length: 7 }, (_, i) => tr("m" + i, new Date(T("2026-10-30T06:00:00Z") + i * ORA).toISOString(), new Date(T("2026-10-30T06:30:00Z") + i * ORA).toISOString(), 0.5)), acum: ACUM });
  const m = MC.frana(f7);
  assert.equal(m.nivel, "critic"); assert.match(m.mesaj, /^7 boți porniți azi \(pragul: 7\)\./);
  const TOKEN = "token-de-proba-v100280";
  const kv = () => { const s = new Map(); return { s, get: async (k) => (s.has(k) ? s.get(k) : null), put: async (k, v) => { s.set(k, v); }, delete: async (k) => { s.delete(k); }, list: async () => ({ keys: [] }) }; };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const post = async (env, corp) => { const r = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=config", { method: "POST", headers: { "cf-connecting-ip": "10.0.2.80", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify(corp) }), env }); return r.status; };
  const get = async (env) => (await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=config", { headers: { "cf-connecting-ip": "10.0.2.80", authorization: "Bearer " + TOKEN } }), env })).json()).config;
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kv() };
  assert.equal(await post(env, { frana: { zi: 20, sapt: 60, rand: 3, boti: 7.4 } }), 200);
  assert.deepEqual((await get(env)).frana, { zi: 20, sapt: 60, rand: 3, boti: 7 });
  assert.equal(await post(env, { frana: { zi: 20, sapt: 60, rand: 3 } }), 200, "clientul vechi, fără boti");
  assert.deepEqual((await get(env)).frana, { zi: 20, sapt: 60, rand: 3 });
  assert.equal(await post(env, { frana: { zi: 20, sapt: 60, rand: 3, boti: -2 } }), 400);
  assert.equal(await post(env, { frana: { zi: 20, sapt: 60, rand: 3, boti: "x" } }), 400);
});

await test("(1) Poarta din Grid: câmpul „boți pe zi” și salvarea lui; Acasă citește pragurile", () => {
  const app = citeste("public", "app.js"), ae = lib("acasa-ecran.js");
  assert.match(app, /<label><span class="tbEt2">boți pe zi<\/span><input id="grFranaBoti" inputmode="numeric" value="'\+fp\.boti\+'"><\/label>/);
  assert.match(app, /rand:Math\.round\(v\("grFranaRand"\)\),boti:Math\.round\(v\("grFranaBoti"\)\)\};/);
  assert.match(app, /if\(!\(p\.zi>0&&p\.sapt>0&&p\.rand>0&&p\.boti>0\)\)/);
  assert.match(ae, /pas\("franaCfg", async function \(\) \{ var c = await getJSON\("\/api\/istoric-bot\?action=config"\); return c && c\.config && c\.config\.frana \|\| null; \}\)/);
  assert.match(ae, /hb \+= acFranaZileiHtml\(typeof contTot !== "undefined" && contTot\.inchiseOk \? contTot\.inchise : null, act, d\.franaCfg, Date\.now\(\)\);/);
  assert.ok(ae.indexOf("hb += acFranaZileiHtml(") < ae.indexOf("hb += acBotiStatHtml("), "contorul înaintea blocului „Azi”");
});

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ae = lib("acasa-ecran.js");
const F = new Function("Acasa", "escapeHtml", "acCate", "Obiceiuri", ae.slice(ae.indexOf("// v100.279 (ideea 1)"), ae.indexOf("function acasaDeseneaza() {")) + "; return { acFranaZileiHtml, acBotiStatHtml };")(AC, esc, (n, s, p) => globalThis.TextRo.cate(n, s, p), OB);
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "|[SVG]|").replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").replace(/ /g, " ");

await test("(1) contorul zilei pe Acasă: boți / la rând pe pragurile lui, ziua și 7 zile cu o zecimală; trasă ⇒ spus; lista neadusă ⇒ nimic", () => {
  const inch = [tr("c", "2026-10-30T08:00:00Z", "2026-10-30T08:05:00Z", -2.04), tr("d", "2026-10-30T09:00:00Z", "2026-10-30T09:05:00Z", -1.26), tr("e", "2026-10-25T10:00:00Z", "2026-10-25T10:05:00Z", 3)];
  const h = text(F.acFranaZileiHtml(inch, [{ activ: true, pornitLa: T("2026-10-30T12:00:00Z"), profitTotal: -0.5 }], null, ACUM));
  assert.equal(h, "|Frâna zilei |· pragurile tale|3 din 7 boți · 2 din 3 la rând|Azi −3,8 din −20 · pe 7 zile −0,8 din −60 USDT.|");
  const tras = text(F.acFranaZileiHtml(inch, [], { zi: 3, sapt: 60, rand: 3, boti: 7 }, ACUM));
  assert.match(tras, /\|Azi −3,3 din −3 · pe 7 zile −0,3 din −60 USDT\. Trasă: n-aș mai porni boți azi\.\|$/);
  assert.match(F.acFranaZileiHtml(inch, [], { zi: 3, sapt: 60, rand: 3, boti: 7 }, ACUM), /<b class="bad">/);
  assert.equal(F.acFranaZileiHtml(null, [], null, ACUM), "");
});

await test("(2) treapta timpurie: din același tabel (sub 50%, cel puțin 30 de cazuri), înaintea regulii (sub 30%); regula veche neschimbată", () => {
  const tabel = [{ h: 1, n: 101, intoarse: 0.69 }, { h: 3, n: 74, intoarse: 0.58 }, { h: 6, n: 54, intoarse: 0.41 }, { h: 12, n: 43, intoarse: 0.28 }, { h: 24, n: 32, intoarse: 0.09 }, { h: 48, n: 27, intoarse: 0.04 }];
  assert.equal(DI.regulaDin(tabel, 0.5, 30).h, 6); assert.equal(DI.regulaDin(tabel, 0.3, 30).h, 12);
  assert.equal(DI.regulaDin(tabel, 0.05, 30), null, "48 h are doar 27 de cazuri");
  assert.equal(DI.regulaDin([{ h: 6, n: 20, intoarse: 0.1 }, { h: 12, n: 40, intoarse: 0.4 }], 0.5, 30).h, 12, "sub 30 de cazuri se sare");
  // iesiriBanda folosește aceeași construcție (regula de 30%)
  assert.match(lib("disciplina.js"), /var regula = regulaDin\(tabel, o\.prag \|\| 0\.3, o\.min \|\| 30\);/);
  const dv = DI.regulaDin(tabel, 0.5, 30), r = DI.regulaDin(tabel, 0.3, 30);
  assert.equal(DI.alertaBanda(5.9 * ORA, dv, r, {}), null);
  assert.equal(DI.alertaBanda(6 * ORA, dv, r, {}), "devreme");
  assert.equal(DI.alertaBanda(7 * ORA, dv, r, { devreme: true }), null, "o dată pe episod");
  assert.equal(DI.alertaBanda(12 * ORA, dv, r, {}), "regula", "la regulă pleacă alerta veche, nu treapta");
  assert.equal(DI.alertaBanda(12 * ORA, dv, r, { devreme: true }), "regula");
  assert.equal(DI.alertaBanda(13 * ORA, dv, r, { anuntat: true, devreme: true }), null);
  assert.equal(DI.alertaBanda(7 * ORA, dv, null, {}), "devreme", "fără regulă, treapta singură");
  assert.equal(DI.alertaBanda(7 * ORA, r, r, {}), null, "treapta nu e înaintea regulii ⇒ nimic în plus");
});

await test("(2) colectorul: treapta din tabelul benzii, prin Disciplina.alertaBanda, înaintea alertei de 12 h; mesajul spune ambele praguri", () => {
  const col = citeste("scripts", "colector.mjs"), f = col.slice(col.indexOf("async function turaBandaLiveCorp() {"), col.indexOf("// v101.116 (auditul sever, C5)"));
  assert.match(f, /const dv = bandaMemo\.v && bandaMemo\.v\.tabel \? Disciplina\.regulaDin\(bandaMemo\.v\.tabel, 0\.5, 30\) : null;/);
  assert.match(f, /if \(Disciplina\.alertaBanda\(Date\.now\(\) - s\.de, dv, r, s\) === "devreme"\) \{ if \(await trimiteAlerta\(MesajeColector\.afaraDinBandaDevreme\(s\.nume, \(Date\.now\(\) - s\.de\) \/ 3600000, dv, r\), b\.id, "banda-devreme"\)\) \{ s\.devreme = true; scrieStare\(\); \} \}/);
  assert.ok(f.indexOf('"banda-devreme"') < f.indexOf('"banda-regula"'));
  const m = MC.afaraDinBandaDevreme("PARTI", 6.2, { h: 6, n: 54, intoarse: 0.41 }, { h: 12, n: 43, intoarse: 0.28 });
  assert.equal(m.titlu, "PARTI: de 6 ore afară din grilă"); assert.equal(m.nivel, "atentie");
  assert.equal(m.mesaj, "Din boții tăi închiși, după 6 h afară doar 41% s-au mai întors în 24 h (54 de cazuri); după 12 h, 28%.\n👉 Aș hotărî acum, nu la 12 h: îl închid sau îi mut banda.");
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /co\("botul afară din grilă: treapta timpurie", "afaraDinBandaDevreme"/);
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /co\("frâna contului: 7 boți porniți azi", "frana"/);
});

await test("(3) grilele / poziția pe 7 zile: sumele, realizatul = grile + poziție, rândul înaintea comisioanelor; boții fără grile spuși", () => {
  const L = [
    { id: "1", moneda: "A", pornit: ACUM - 5 * ORA, inchis: ACUM - 4 * ORA, net: -9, grile: 3, pozitie: -10, comisioane: -2, funding: 0 },
    { id: "2", moneda: "B", pornit: ACUM - 30 * ORA, inchis: ACUM - 29 * ORA, net: 4.5, grile: 6, pozitie: 0, comisioane: -1.5, funding: 0 },
    { id: "3", moneda: "C", pornit: ACUM - 50 * ORA, inchis: ACUM - 49 * ORA, net: -1, grile: null, pozitie: null, comisioane: -1, funding: 0 },
  ];
  const c = AC.botiCosturi(L, ACUM - 7 * 86400000, ACUM);
  assert.equal(c.grile, 9); assert.equal(c.pozitie, -10); assert.equal(c.nGrile, 2);
  const h = text(F.acBotiStatHtml(L, ACUM));
  assert.match(h, /\|Grilele au prins \|· poziția a dat −10,0 USDT · fără grile la 1 bot\|\+9,0 USDT\|/);
  assert.ok(h.indexOf("Grilele au prins") < h.indexOf("Comisioane și funding"));
});

// v100.281: de la v100.280 / v101.152 în sus (ca probele vechi), nu exact
await test("versiunile: de la v100.280 în aplicație, de la v101.152 în colector", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 280, String(app));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 152);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
