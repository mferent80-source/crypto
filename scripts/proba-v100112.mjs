// Proba v100.112 / colector v101.75 (06.10, el: „fa tot” după raportul v100.111):
// (W) Tabloul pe telefon nu mai iese din ecran (465 px la 400: cipul lung din Consilier + rândurile „Dovada”)
// I-551 „copiază” lângă prețul propus în „Ce ai de făcut acum” (din câmpul sfatului, nu din text)
// I-552 dimineața pe Discord: becurile 4 h / 1 zi pe fiecare bot și poziție + ce s-a schimbat peste noapte
// I-553 starea semaforului din Tablou (tura, reluarea, opțiunile becurilor) într-un modul pur, cu probe pe comportament
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const exista = (...p) => fs.existsSync(path.join(RAD, ...p));
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "grafic-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
if (exista("public", "lib", "tablou-trend.js")) vm.runInThisContext(citeste("public", "lib", "tablou-trend.js"), { filename: "tablou-trend.js" });
const { Sfaturi: SF, TabloExtra: TE, GraficBot: GB } = globalThis;
const app = citeste("public", "app.js"), html = citeste("public", "index.html"), css = citeste("public", "app.css"), col = citeste("scripts", "colector.mjs");
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); return src.slice(i, src.indexOf("\nfunction ", i + 10)); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.112 · telefonul + I-551 + I-552 + I-553 · proba\n");

// ---------------- (W) telefonul ----------------
await test("(W) sub 600 px: rândurile „Dovada” se rup pe două coloane; cipurile Consilierului se rup pe rânduri (nu împing pagina)", () => {
  assert.match(css, /#botiRanduri \.accountRow,#tbRigla \.accountRow,#tbDovada \.accountRow\{grid-template-columns:1fr 1fr;min-width:0\}/);
  assert.match(css, /@media\(max-width:760px\)\{#tabloubot \.tbConsCip\{white-space:normal;border-radius:10px;max-width:100%\}\}/);
});

// ---------------- I-551 ----------------
const T0 = Date.UTC(2026, 9, 6, 6, 0), ORA = 36e5;
const K4 = (p, amp) => Array.from({ length: 300 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 5)); return { time: T0 - (300 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
const NIL = (o) => Object.assign({ id: "2406", baza: "NIL.PERP", directie: "long", levier: 5, investit: 43.87, profitTotal: -1.2, pretCurent: 0.0995, gridJos: 0.09831, gridSus: 0.104,
  distantaLichidarePct: 30, pretLichidare: 0.08, gridProfitBrut: 0.4, pornitLa: T0 - 3 * ORA }, o || {});
const zeroSfat = () => { const x = SF.intrare({ bot: NIL(), k4: K4(0.0995, 0.03), funding: null, fisa: null, rezumat: null, acum: T0 }); x.zero = { pretZero: 0.1008, distantaZeroPct: 0.013, iei: 42.6 }; return SF.sfaturi(x).find((s) => s.cod === "zero"); };
await test("(551a) sfatul cu take-profit-ul la zero poartă prețul de copiat ca CÂMP (nu scos din text)", () => {
  const z = zeroSfat();
  assert.match(z.faCe, /^Aș pune take-profit-ul botului la 0\.1008 /); assert.deepEqual(z.copiaza, [{ ce: "take-profit", pret: "0.1008" }]);
});
await test("(551b) „Ce ai de făcut acum” duce prețul de copiat mai departe, și când sfatul se unește cu alerta cu același titlu", () => {
  const z = zeroSfat();
  const l = TE.ceAiDeFacut({ acum: T0, dateLa: T0, sfaturi: [z], avertismente: [], alerte: [] });
  assert.deepEqual(l.find((x) => /zero la 0\.1008/.test(x.titlu)).copiaza, [{ ce: "take-profit", pret: "0.1008" }]);
  const l2 = TE.ceAiDeFacut({ acum: T0, dateLa: T0, sfaturi: [z], avertismente: [], alerte: [{ t: T0 - 6e5, nivel: "atentie", titlu: "NIL: " + z.titlu, mesaj: "x", cheie: "zero" }] });
  assert.equal(l2.length, 1); assert.deepEqual(l2[0].copiaza, [{ ce: "take-profit", pret: "0.1008" }]);
});
await test("(551c) tbRenderTodo rulat: butonul „copiază take-profit 0.1008” lângă rând, cu valoarea curată", () => {
  const el = {}, $ = (id) => (el[id] = el[id] || { innerHTML: "", textContent: "" });
  const ctx = { $, TabloExtra: TE, tbStare: { bot: NIL(), alerteServer: [], sfaturiLista: [zeroSfat()], botLa: T0, avertLista: [] }, tbPlan: { botId: "2406", plan: { plus: 2, minus: 4 } }, tbContTot: () => {}, Date };
  vm.createContext(ctx); vm.runInContext(fn(app, "escapeHtml") + "\n" + fn(app, "tbRenderTodo"), ctx);
  ctx.tbRenderTodo();
  assert.match(el.tbTodoLista.innerHTML, /<button type="button" class="tbBtnLinie tbTodoCopiaza" value="0\.1008" data-action-click="gridCopiaza\(this\.value\)" aria-label="Copiază prețul pentru take-profit: 0\.1008">copiază take-profit 0\.1008<\/button>/);
});

// ---------------- I-552 ----------------
const TD = exista("scripts", "lib", "tura-dimineata.mjs") ? await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-dimineata.mjs")).href) : {};
await test("(552a) liniiBecuri: becurile 4h · 1z (⚠ împotriva botului, „?” = fără date, 1z lipsă în afara SUA), boții cu aceeași monedă deosebiți", () => {
  const r = TD.liniiBecuri([{ cheie: "bot-2406", nume: "NIL", dir: "long", h4: "urca", z1: "lateral" }, { cheie: "t212-AAPL_US_EQ", nume: "AAPL", dir: "long", h4: "coboara", z1: null }, { cheie: "bot-2403", nume: "HYPE", dir: "short", h4: "urca", z1: "coboara" },
    { cheie: "t212-SAP_DE_EQ", nume: "SAP", dir: "long", h4: "urca", z1: null, faraZ1: true }, { cheie: "bot-9", nume: "NIL", dir: "short", h4: "urca", z1: "lateral" }],
    { "bot-2406": { h4: "urca", z1: "urca" }, "bot-2403": { h4: "urca", z1: "coboara" } }, "Peste noapte");
  assert.deepEqual(r.linii, ["🚦 Becurile 4h · 1z: NIL long ↑4h ↔1z · AAPL ↓4h ?1z ⚠ · HYPE ↑4h ↓1z ⚠ · SAP ↑4h · NIL short ↑4h ↔1z ⚠", "🔁 Peste noapte: NIL long 1z ↑→↔"]);
  assert.deepEqual(r.azi["bot-2406"], { h4: "urca", z1: "lateral" });
  assert.deepEqual(TD.liniiBecuri([{ cheie: "a", nume: "A", dir: "long", h4: "urca", z1: "urca" }], { a: { h4: "urca", z1: "urca" } }, "Peste noapte").linii[1], "🔁 Peste noapte: niciun bec schimbat");
  assert.deepEqual(TD.liniiBecuri([{ cheie: "a", nume: "A", dir: "long", h4: "urca", z1: "urca" }, { cheie: "b", nume: "B", dir: "long", h4: "urca", z1: "urca" }], { a: { h4: "urca", z1: "urca" } }, "Față de 04.10").linii[1], "🔁 Față de 04.10: niciun bec schimbat (1 din 2 comparate)");
  assert.equal(TD.liniiBecuri([{ cheie: "a", nume: "A", dir: "long", h4: "urca", z1: "urca" }], null).linii.length, 1, "fără ziua de ieri: fără rândul schimbărilor");
  assert.deepEqual(TD.liniiBecuri([], {}).linii, []);
  const multe = Array.from({ length: 20 }, (_, i) => ({ cheie: "b" + i, nume: "MONEDA" + i, dir: "long", h4: "lateral", z1: "urca" })), m = TD.liniiBecuri(multe, null).linii;
  assert.ok(m.length > 1 && m.every((x) => x.length <= 160), m.map((x) => x.length).join(",")); for (let i = 0; i < 20; i++) assert.ok(m.join(" ").includes("MONEDA" + i + " "), "MONEDA" + i);
});
await test("(552b) „ieri” = ce a plecat: salvat cu data, doar după trimitere și doar nevid; o valoare lipsă azi o păstrează pe cea știută", async () => {
  const mk = (ok, azi) => ({ acum: Date.UTC(2026, 9, 6, 8, 0), stare: {}, Consilier: { rezumatDimineata: () => ({ titlu: "Dimineața", linii: ["consilierul"] }) }, jurnal: () => {}, trimite: async () => ok,
    date: async () => ({ liniiIntai: ["verdictul"], liniiBecuri: ["🚦 Becurile 4h · 1z: NIL ↑4h ↔1z"], liniiExtra: ["🧭 Busola"], becuriAzi: azi }) });
  const a = mk(true, { "bot-2406": { h4: "urca", z1: "lateral" } }); const r = await TD.turaDimineata(a);
  assert.equal(r.trimis, true); assert.deepEqual(a.stare.becuriIeri, { data: "2026-10-06", b: { "bot-2406": { h4: "urca", z1: "lateral" } } });
  assert.deepEqual(r.linii, ["verdictul", "🚦 Becurile 4h · 1z: NIL ↑4h ↔1z", "consilierul", "🧭 Busola"], "becurile sus, după rândul-verdict (mesajul se taie la coadă: 600 în Radar, 2000 pe Discord)");
  const b = mk(false, { x: { h4: "urca", z1: null } }); await TD.turaDimineata(b); assert.equal(b.stare.becuriIeri, undefined);
  const c = mk(true, {}); c.stare.becuriIeri = { data: "2026-10-05", b: { x: { h4: "urca", z1: "urca" } } }; await TD.turaDimineata(c); assert.deepEqual(c.stare.becuriIeri.b, { x: { h4: "urca", z1: "urca" } }, "azi gol (Pionex / T212 picate) nu șterge ieri");
  assert.deepEqual(TD.liniiBecuri([{ cheie: "x", nume: "X", dir: "long", h4: "coboara", z1: null }], { x: { h4: "urca", z1: "urca" } }).azi.x, { h4: "coboara", z1: "urca" });
  assert.equal(TD.etichetaIeri("2026-10-05", Date.UTC(2026, 9, 6, 8, 0)), "Peste noapte"); assert.equal(TD.etichetaIeri("2026-10-03", Date.UTC(2026, 9, 6, 8, 0)), "Față de 03.10");
});
await test("(552c) colectorul adună becurile: boții din directiaBotului (4 h + 1 zi), pozițiile T212 din barele lor (1z doar SUA, 4 h din prețurile de 4 h)", () => {
  const d = fn(col, "dateDimineata");
  assert.match(d, /await directiaBotului\(b\)/); assert.match(d, /interval=4h&ticker=/); assert.match(d, /GraficBot\.semZi\(barePe\[x\.ticker\], "long"\)/); assert.match(d, /faraZ1: !\/_US_EQ\$\/\.test\(x\.ticker\)/);
  assert.match(d, /ieri = meta\(\)\.becuriIeri, lb = liniiBecuri\(becuri, ieri && ieri\.b \|\| null, etichetaIeri\(ieri && ieri\.data, Date\.now\(\)\)\);/); assert.match(d, /out\.liniiBecuri = lb\.linii; out\.becuriAzi = lb\.azi;/);
  assert.match(col, /import \{ turaDimineata as turaDimineataModul, liniiBecuri, etichetaIeri \} from "\.\/lib\/tura-dimineata\.mjs";/);
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /liniiBecuri\(/, "rândurile becurilor intră în garda textelor (raport ≤ 160)");
});

// ---------------- I-553 ----------------
const TT = globalThis.TabloTrend || {};
const DIR = [{ tf: "15M", eticheta: "15 min", orizont: 16, limit: 500, orizontText: "4 ore" }, { tf: "60M", eticheta: "1 oră", orizont: 24, limit: 500, orizontText: "o zi" }, { tf: "4H", eticheta: "4 ore", orizont: 6, limit: 500, orizontText: "o zi" }, { tf: "1D", eticheta: "1 zi", orizont: 7, limit: 400, orizontText: "o săptămână" }];
const EXTRA = [{ tf: "5M", limit: 500 }, { tf: "30M", limit: 500 }];
const randuri = (tf) => [{ time: 1, open: 1, high: 1, low: 1, close: 1, tf }];
const aducator = (plan) => { const cereri = []; return { cereri, aduce: async (tf, lim) => { cereri.push(tf + ":" + lim); const p = plan[tf]; if (p === "eroare") throw new Error("Pionex 429 pe " + tf); return p === "gol" ? null : randuri(tf); } }; };
const an = (rows, x) => ({ dir: "lateral", vechime: 3, x: x.tf });
await test("(553a) TabloTrend.tura: pe rând, „Direcția” cu motivul erorii, semaforul primește lumânările pe măsură ce vin, lipsa se reia doar dacă n-au căzut toate", async () => {
  const a = aducator({ "60M": "eroare", "4H": "gol", "30M": "eroare" }), pasi = [];
  const r = await TT.tura({ dirTf: DIR, extraTf: EXTRA, aduce: a.aduce, analizeaza: an, motiv: (e) => "motiv: " + e.message, pas: (pe) => pasi.push(Object.keys(pe).join(",")) });
  assert.deepEqual(a.cereri, ["15M:500", "60M:500", "4H:500", "1D:400", "5M:500", "30M:500"], "pe rând, în ordinea de azi");
  assert.deepEqual(r.rez.map((x) => x.tf + "=" + (x.dir || x.stare)), ["15M=lateral", "60M=eroare", "4H=eroare", "1D=lateral"]);
  assert.equal(r.rez[1].motiv, "motiv: Pionex 429 pe 60M"); assert.equal(r.rez[2].motiv, "motiv: Pionex nu a dat lumânări");
  assert.deepEqual(r.rez[0], { tf: "15M", eticheta: "15 min", orizontText: "4 ore", dir: "lateral", vechime: 3, x: "15M" });
  assert.deepEqual(Object.keys(r.pe), ["15M", "1D", "5M"]); assert.deepEqual(pasi, ["15M", "15M,1D", "15M,1D,5M"]);
  assert.deepEqual(r.lipsa, ["60M", "4H", "30M"]); assert.equal(r.eroare, false); assert.equal(r.reiaProgramat, true);
  const toate = await TT.tura({ dirTf: DIR, extraTf: EXTRA, aduce: aducator({ "15M": "eroare", "60M": "eroare", "4H": "eroare", "1D": "eroare" }).aduce, analizeaza: an });
  assert.equal(toate.eroare, true); assert.equal(toate.reiaProgramat, false, "au căzut toate: se reia toată tura la 30 s, nu doar lipsa"); assert.match(toate.rez[0].motiv, /Pionex 429 pe 15M/);
});
await test("(553b) TabloTrend.reia: o singură dată, doar lipsa; rândul „Direcției” se reface, ce tot nu vine ⇒ „a doua oară”", async () => {
  const d = { rez: [{ tf: "15M", dir: "lateral" }, { tf: "60M", dir: null, stare: "eroare" }, { tf: "4H", dir: null, stare: "eroare" }, { tf: "1D", dir: "urca" }], randuriPe: { "15M": randuri("15M"), "1D": randuri("1D"), "5M": randuri("5M") }, lipsa: ["60M", "4H", "30M"], reiaProgramat: true };
  const a = aducator({ "4H": "eroare" });
  await TT.reia(d, { dirTf: DIR, extraTf: EXTRA, aduce: a.aduce, analizeaza: an });
  assert.deepEqual(a.cereri, ["60M:500", "4H:500", "30M:500"]);
  assert.deepEqual(d.rez.map((x) => x.tf + "=" + (x.dir || x.stare)), ["15M=lateral", "60M=lateral", "4H=eroare", "1D=urca"]); assert.equal(d.rez[1].eticheta, "1 oră");
  assert.ok(d.randuriPe["60M"] && d.randuriPe["30M"] && !d.randuriPe["4H"]);
  assert.deepEqual(d.lipsa, ["4H"]); assert.equal(d.reiaProgramat, false); assert.equal(d.aDouaOara, true); assert.equal(d.eroare, false);
});
await test("(553c) TabloTrend.stareSemafor: lumânările botului de ACUM (nu ale celui de dinainte) și „reîncerc / a doua oară / se aduc”", () => {
  const pe = { "15M": randuri("15M") };
  assert.deepEqual(TT.stareSemafor({ simbol: "NIL|long", randuriPe: pe, reiaProgramat: true, aDouaOara: false }, "NIL|long"), { pe, opt: { reincerc: true, aDouaOara: false, seAduc: false } });
  assert.deepEqual(TT.stareSemafor({ simbol: "TAKE|long", randuriPe: pe, peLucru: { cheie: "NIL|long", pe } }, "NIL|long"), { pe, opt: { reincerc: false, aDouaOara: false, seAduc: true } });
  assert.equal(TT.stareSemafor({ simbol: "TAKE|long", randuriPe: pe }, "NIL|long"), null, "alt bot: nimic până vin ale lui");
  assert.equal(TT.stareSemafor(null, "NIL|long"), null);
});
await test("(553e) revizia: lista GOALĂ de lumânări rămâne date, ca înainte (nu eroare, nu reluare); reluarea o tratează tot ca lipsă", async () => {
  const gol = { aduce: async (tf) => (tf === "4H" || tf === "5M" ? [] : randuri(tf)) };
  const r = await TT.tura({ dirTf: DIR, extraTf: EXTRA, aduce: gol.aduce, analizeaza: (rows) => (rows.length ? { dir: "lateral" } : { dir: null, stare: "nu-se-poate", motiv: "sub 60 de bare închise" }) });
  assert.equal(r.rez[2].stare, "nu-se-poate"); assert.deepEqual(r.pe["4H"], []); assert.deepEqual(r.pe["5M"], []); assert.deepEqual(r.lipsa, []); assert.equal(r.reiaProgramat, false);
  const d = { rez: [], randuriPe: {}, lipsa: ["4H"] }; await TT.reia(d, { dirTf: DIR, extraTf: EXTRA, aduce: gol.aduce, analizeaza: an }); assert.deepEqual(d.lipsa, ["4H"], "la reluare, golul rămâne lipsă (ca în v100.110)");
  assert.match(fn(app, "tbAduTf"), /if\(!Array\.isArray\(r\)\)throw/);
  assert.match(fn(app, "tbAduDirectie"), /d\.randuri4h=t\.pe\["4H"\]\|\|\(d\.simbol===cheie\?d\.randuri4h:null\);/, "4 h picat la altă monedă: nu lumânările monedei vechi");
  assert.match(fn(app, "tbAduDirectie"), /if\(!b\|\|typeof Directie==="undefined"\|\|typeof TabloTrend==="undefined"\)return;/); assert.match(fn(app, "tbSemaforTf"), /if\(!d\|\|!b\|\|typeof TabloTrend==="undefined"\)return null;/);
});
await test("(553d) pagina folosește modulul: tura, reluarea și becurile trec prin TabloTrend; modulul e încărcat înaintea app.js și e în cache-ul aplicației", () => {
  assert.match(fn(app, "tbAduDirectie"), /await TabloTrend\.tura\(\{dirTf:TB_DIR_TF,extraTf:TB_SEM_EXTRA,/);
  assert.match(fn(app, "tbReiaLipsa"), /await TabloTrend\.reia\(d,\{dirTf:TB_DIR_TF,extraTf:TB_SEM_EXTRA,/);
  assert.match(fn(app, "tbSemaforTf"), /TabloTrend\.stareSemafor\(d,tbCheieDir\(b\)\)/);
  assert.ok(html.indexOf('<script src="/lib/tablou-trend.js"></script>') > 0 && html.indexOf('<script src="/lib/tablou-trend.js"></script>') < html.indexOf('src="/app.js'));
  assert.match(citeste("public", "sw.js"), /"\/lib\/tablou-trend\.js"/);
});
await test("(E) versiunea v100.112 / colector v101.75", () => {
  assert.match(html, /content="v100\.112"/); assert.match(html, /id="antetVersiune">v100\.112/); assert.match(html, /id="healthAppVersion">v100\.112</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.112.0");
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-112";/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.75";/);
  const sc = JSON.parse(citeste("package.json")).scripts; assert.equal(sc["test:v100112"], "node scripts/proba-v100112.mjs"); assert.match(sc.test, /npm run test:v100112/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
