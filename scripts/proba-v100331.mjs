// Proba v100.331 (12.11.2026, el, după v100.330: „ok, la 1 fă și integrează în detaliile indicatorilor ca și indicator separat ce zici? 2,3,4 fă tot”):
//   1. listele de monede (pe revenire / pentru short) urmărite FAȚĂ DE PIAȚĂ, pe zile (colectorul: urmarireFixa, ca „Pe ce aș porni”); Piața azi le
//      arată la coloanele lor; Tabloul: blocul „Listele Radarului” în detaliile indicatorilor (moneda botului e azi într-o listă? + cum au ieșit
//      listele față de piață) - fapte, fără verdict „dovedit” (regulile lui de probă: pe zile, fără test nou nesimulat);
//   2. fișa monedei ținută minte (≤ 2 h, ca ultimul verdict): verdictul, cartela fișei și sfaturile se socotesc imediat, cu „pe fișa de la HH:MM”;
//   4. golul rămas: „Sugestii de acțiuni · Trend 12 luni” în dreapta, sub „Ce aș cumpăra azi” (lipite, ca până acum), „Boții tăi” pe trei rânduri.
//   node scripts/proba-v100331.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.331 · listele față de piață (+ în Tablou), fișa ținută minte, golul · proba\n");

// ───────────── 1a. colectorul și ruta ─────────────
const TS = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-sugestii.mjs")).href);
const ZI = 86400000, H = 3600000;
// barele de 1 h: A coboară 10% în 7 zile, B urcă 10%, C stă (piața = mediana lui A, B, C = 0)
const bare = (dela, pana, f) => { const o = []; for (let t = dela; t <= pana; t += H) o.push({ t, c: f(t) }); return o; };
const T0 = Date.parse("2026-11-01T06:00:00Z"), T1 = T0 + 7 * ZI;
const BARE = { A: bare(T0 - H, T1 + H, (t) => (t >= T1 ? 90 : 100)), B: bare(T0 - H, T1 + H, (t) => (t >= T1 ? 110 : 100)), C: bare(T0 - H, T1 + H, () => 100) };
await test("1a. urmarireFixa pe lista de short: moneda care cade bate piața (semnul short), pe zile", () => {
  const u = TS.urmarireFixa([{ zi: "2026-11-01", simbol: "A", dir: "short" }], { zile: 7, cost: 0, bare1h: (s) => BARE[s], toate: ["A", "B", "C"], acum: T1 + 2 * H });
  assert.equal(u.zile, 1); assert.ok(Math.abs(u.exces - 0.10) < 1e-9, "exces " + u.exces); assert.equal(u.zilePeste, 1);
});
await test("1a. tura sugestiilor: revenireFata / shortFata = urmarireFixa (short cu semnul lui), lângă urmărirea veche", () => {
  const S = citeste("scripts", "lib", "tura-sugestii.mjs");
  assert.match(S, /revenireFata: urmarireFixa\(ist\.filter\(\(x\) => x && x\.lista === "revenire"\), \{ zile: 7, cost: 0\.001, bare1h: bare1hO, toate: d\.simboluriDepozit\(\), acum: d\.acum \}\)/);
  assert.match(S, /shortFata: urmarireFixa\(ist\.filter\(\(x\) => x && x\.lista === "short"\)\.map\(\(x\) => Object\.assign\(\{\}, x, \{ dir: "short" \}\)\), \{ zile: 7, cost: 0\.001, bare1h: bare1hO, toate: d\.simboluriDepozit\(\), acum: d\.acum \}\)/);
});
await test("1a. ruta păstrează revenireFata / shortFata (și ferestrele) la salvarea sugestiilor", () => {
  const R = citeste("functions", "api", "istoric-bot.js");
  assert.match(R, /urmarire:\{revenire:ur\(w\.revenire\),short:ur\(w\.short\),porn:ur\(w\.porn\),revenireFata:ur\(w\.revenireFata\),shortFata:ur\(w\.shortFata\)\}/);
  assert.match(R, /const ur=x=>x&&typeof x==="object"\?\{n:nr\(x\.n\),pePlus:nr\(x\.pePlus\),medie:nr\(x\.medie\),zile:nr\(x\.zile\),exces:nr\(x\.exces\),zilePeste:nr\(x\.zilePeste\),ferestre:nr\(x\.ferestre\),/);
  assert.match(citeste("scripts", "lib", "tura-sugestii.mjs"), /inAsteptare, ferestre, zileCuPiata: excesZi\.length \}/, "urmarireFixa întoarce și numărul ferestrelor independente");
});

// ───────────── 1b. Piața azi ─────────────
const FATA_R = { n: 124, zile: 31, exces: -0.012, zilePeste: 0.42, ferestre: 5 }, FATA_S = { n: 139, zile: 33, exces: 0.008, zilePeste: 0.55, ferestre: 5 };
const SUG = (f) => ({ sugestii: { dovada: { revenire: { piata: { eticheta: "n-am aflat" } }, short: { piata: { eticheta: "n-am aflat" } } },
  urmarire: Object.assign({ revenire: { text: "Din 124 de sugestii de cel puțin 7 zile: 14 pe plus, −22,3% …" }, short: { text: "Din 139 …" } }, f ? { revenireFata: FATA_R, shortFata: FATA_S } : {}) } });
function acasa() {
  const I = { reveniriBoti: (c, t, n) => ["AKE", "ORDI"].slice(0, n).map((m) => ({ moneda: m, simbol: m + "_USDT_PERP" })), shortBoti: (c, t, n) => ["DOGE"].slice(0, n).map((m) => ({ moneda: m, simbol: m + "_USDT_PERP" })), ideiBoti: () => [] };
  const ctx = { escapeHtml: esc, Idei: I, acAziNu: () => null, acAziNuHtml: () => "", acPauzaSezon: () => null, TextRo: globalThis.TextRo };
  vm.createContext(ctx);
  const A = lib("acasa-ecran.js");
  vm.runInContext(["acClasamentSumar", "acSym", "acasaCumpar", "acasaCumpar2Parti", "acFataPiata"].map((f) => fnDin(A, f)).join("\n") + "\n;this.f=acasaCumpar;this.fata=acFataPiata;", ctx);
  return ctx;
}
const CL = { la: 5, monede: [{ simbol: "HYPE_USDT_PERP", stare: "candidat", revenire: { revine: true } }] };
await test("1b. Piața azi: fiecare listă de monede spune cum a ieșit față de piață, pe zile (nu doar „de la prețul sugestiei”)", () => {
  const c = acasa(), col = c.f({ idei: null, clasament: CL, sugestii: SUG(true) }).split('<div class="acCumparCol">').slice(1);
  assert.match(text(col[1]), /față de piața din aceleași zile: −1,2 pp în medie la 7 zile, mai bine decât piața în 13 din 31 de zile/);
  assert.match(text(col[2]), /față de piața din aceleași zile: \+0,8 pp în medie la 7 zile, mai bine decât piața \(pentru un short\) în 18 din 33 de zile/);
  assert.doesNotMatch(text(col[1]), /−22,3%/, "urmărirea veche (de la prețul sugestiei, fără reper) nu mai stă la vedere când există cea față de piață");
});
await test("1b. fără urmărirea nouă (colectorul n-a rulat încă) rămâne cea veche + „față de piață: la tura de dimineață”", () => {
  const c = acasa(), col = c.f({ idei: null, clasament: CL, sugestii: SUG(false) }).split('<div class="acCumparCol">').slice(1);
  assert.match(text(col[1]), /−22,3%/); assert.match(text(col[1]), /față de piață: vine la tura de dimineață/);
});
await test("1b. acFataPiata: prea puține zile ⇒ spune asta; fără cifre ⇒ gol", () => {
  const c = acasa();
  assert.match(c.fata({ zile: 3, exces: 0.02, zilePeste: 0.66, ferestre: 1 }), /prea puține zile ca să se vadă ceva/);
  assert.equal(c.fata(null), "");
});

// ───────────── 1c. Tabloul: „Listele Radarului” în detaliile indicatorilor ─────────────
const IB = new Function(lib("indicatori-bot.js") + "; return IndicatoriBot;")();
const LR = (o) => IB.listeRadar(Object.assign({ moneda: "HYPE", dirBot: "short", rev: ["AKE", "ORDI"], short: ["HYPE", "CC", "KAS"], fata: { revenire: FATA_R, short: FATA_S }, eticheta: { revenire: "n-am aflat", short: "n-am aflat" } }, o));
await test("1c. IndicatoriBot.listeRadar: HYPE short e azi în lista de short ⇒ „de partea botului”; rândurile listelor față de piață", () => {
  const r = LR();
  assert.equal(r[0].eticheta, "Azi");
  assert.match(r[0].text, /HYPE e în „Monede pentru short” · de partea botului/);
  assert.match(r[1].eticheta, /Revenire/); assert.match(r[1].text, /−1,2 pp față de piață la 7 zile · mai bine decât piața în 13 din 31 de zile/);
  assert.match(r[2].eticheta, /Short/); assert.match(r[2].text, /\+0,8 pp față de piață/);
  assert.ok(r.every((x) => x.ton === "neutru"), "nicio culoare de avantaj: listele n-au avantaj dovedit");
  assert.match(r[1].titlu, /n-am aflat/);
});
await test("1c. bot long pe o monedă din lista de short ⇒ „contra botului”; în ambele liste ⇒ semnale opuse; în niciuna ⇒ spune asta", () => {
  assert.match(LR({ dirBot: "long" })[0].text, /contra botului/);
  assert.match(LR({ rev: ["HYPE"], short: ["HYPE"] })[0].text, /în ambele liste .* semnale opuse/);
  assert.match(LR({ moneda: "ETH" })[0].text, /ETH nu e azi în listele de revenire sau short/);
  assert.match(LR({ fata: null })[1].text, /vine la tura de dimineață/);
});
await test("1c. Tabloul desenează blocul după tabelul indicatorilor și își cere datele (clasament + sugestii scurte)", () => {
  const A = citeste("public", "app.js");
  assert.match(fnDin(A, "renderTabloIndicatori"), /el\.innerHTML=tbIndTabelHtml\(l,b\.directie\)\+tbListeRadarHtml\(b\);/);
  assert.match(fnDin(A, "tbListeRadarHtml"), /IndicatoriBot\.listeRadar\(/);
  assert.match(fnDin(A, "tbListeAsigura"), /getJSON\("\/api\/istoric-bot\?action=sugestii&scurt=1"\)/);
  assert.match(fnDin(A, "tbListeAsigura"), /getJSON\("\/api\/istoric-bot\?action=clasament"\)/);
});

// ───────────── 2. fișa ținută minte ─────────────
function lumeFisa() {
  const ls = new Map();
  const ctx = { Date, JSON, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) }, ls };
  vm.createContext(ctx);
  const A = citeste("public", "app.js");
  vm.runInContext("var tbFisa={botId:null,la:0,inLucru:false,fisa:null,eroare:null};\n" + fnDin(A, "tbFisaTine") + "\n" + fnDin(A, "tbFisaRestaureaza") + "\nthis.tine=tbFisaTine;this.rest=tbFisaRestaureaza;this.stare=function(){return tbFisa};this.pune=function(x){tbFisa=x};", ctx);
  return ctx;
}
await test("2. fișa calculată se ține minte pe bot; la deschidere (alt bot în memorie) revine imediat, marcată „veche”", () => {
  const c = lumeFisa(), acum = Date.now();
  c.tine({ botId: "2638", la: acum - 20 * 60000, fisa: { verdict: { nivel: "da" } }, pret: 71.3, amp: 0.04, b15: [1, 2, 3], istoric15: { x: 1 } });
  assert.ok(!/b15|istoric15/.test(c.ls.get("tbFisaUlt")), "barele nu se țin minte (mari, se refac)");
  c.pune({ botId: null, la: 0, inLucru: false, fisa: null, eroare: null });
  c.rest({ id: "2638" });
  const s = c.stare();
  assert.equal(s.botId, "2638"); assert.equal(s.veche, true); assert.deepEqual(JSON.parse(JSON.stringify(s.fisa)), { verdict: { nivel: "da" } }); assert.equal(s.b15, null);
});
await test("2. peste 2 ore, alt bot sau o fișă deja în lucru pentru același bot ⇒ nu se restaurează", () => {
  const c = lumeFisa(), acum = Date.now();
  c.tine({ botId: "2638", la: acum - 3 * 3600000, fisa: { a: 1 } }); c.rest({ id: "2638" }); assert.equal(c.stare().botId, null, "peste 2 h");
  c.tine({ botId: "2638", la: acum - 60000, fisa: { a: 1 } }); c.rest({ id: "9999" }); assert.equal(c.stare().botId, null, "alt bot");
  c.pune({ botId: "2638", la: acum, inLucru: false, fisa: { proaspata: 1 }, eroare: null }); c.rest({ id: "2638" }); assert.equal(c.stare().veche, undefined, "nu peste fișa de acum");
});
await test("2. fișa nouă se ține minte la calcul, se restaurează înainte de desen; verdictul și cartela spun „pe fișa de la HH:MM”", () => {
  const A = citeste("public", "app.js");
  assert.match(fnDin(A, "tbAduFisaBot"), /if\(tbFisa\.fisa\)tbFisaTine\(tbFisa\);/);
  assert.match(A, /tbFisaRestaureaza\(b\);tbDeseneazaExtra\(b\);tbAduFisaBot\(b\);/);
  assert.match(A, /tbFisa\.veche\?'<p class="tbSub">pe fișa de la '\+/);
  assert.match(lib("asezare-paznic.js"), /typeof tbFisa !== "undefined" && tbFisa\.veche && tbFisa\.botId === b\.id/);
});

// ───────────── revizia Opus (12.11) ─────────────
await test("revizia 🔴1: după o refacere picată pe același bot fișa veche NU se repune (altfel refacerea pornea la fiecare tic de 8 s)", () => {
  const c = lumeFisa(), acum = Date.now();
  c.tine({ botId: "2638", la: acum - 20 * 60000, fisa: { a: 1 } });
  c.pune({ botId: "2638", la: acum, inLucru: false, fisa: null, eroare: "Pionex 503" }); c.rest({ id: "2638" });
  assert.equal(c.stare().eroare, "Pionex 503"); assert.equal(c.stare().veche, undefined);
});
await test("revizia 🟡3: cât se calculează fișa altui bot, nu se repune nimic (fără două calcule deodată)", () => {
  const c = lumeFisa(), acum = Date.now();
  c.tine({ botId: "B", la: acum - 20 * 60000, fisa: { b: 1 } });
  c.pune({ botId: "A", la: 0, inLucru: true, fisa: null, eroare: null }); c.rest({ id: "B" });
  assert.equal(c.stare().botId, "A"); assert.equal(c.stare().inLucru, true);
});
await test("revizia 🔵8: o cheie tbFisaUlt stricată se rescrie curat (nu blochează ținerea minte)", () => {
  const c = lumeFisa(); c.ls.set("tbFisaUlt", "{stricat");
  c.tine({ botId: "2638", la: Date.now(), fisa: { a: 1 } });
  assert.ok(JSON.parse(c.ls.get("tbFisaUlt"))["2638"], c.ls.get("tbFisaUlt"));
});
await test("revizia 🔵5/6: nicio zi judecată încă ⇒ o spune (nu dispare); „mai bine decât piața” (la short = în direcția short-ului) pe zilele cu piață", () => {
  const c = acasa();
  assert.match(c.fata({ zile: 0, n: 12, exces: null }), /încă nicio zi judecată/);
  assert.match(c.fata(Object.assign({}, FATA_R, { zileCuPiata: 30 })), /mai bine decât piața în 13 din 30 de zile/);
  assert.match(LR({ fata: { revenire: { zile: 0, n: 5, exces: null }, short: FATA_S } })[1].text, /încă nicio zi judecată/);
  assert.match(LR()[2].text, /mai bine decât piața \(pentru un short\) în 18 din 33 de zile/);
  assert.match(citeste("scripts", "lib", "tura-sugestii.mjs"), /zileCuPiata: excesZi\.length/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /zileCuPiata:nr\(x\.zileCuPiata\)/);
});
await test("revizia 🔵4: tura sugestiilor citește barele o singură dată pentru toate trei urmăririle", () => {
  const S = citeste("scripts", "lib", "tura-sugestii.mjs");
  assert.match(S, /const bare1hO = \(\(\) => \{ const m = new Map\(\); return \(s\) => \{ if \(!m\.has\(s\)\) m\.set\(s, d\.bare1h\(s\)\); return m\.get\(s\); \}; \}\)\(\);/);
  assert.equal((S.match(/bare1h: d\.bare1h,/g) || []).length, 0, "toate trei folosesc bare1hO");
});
await test("revizia 🔵9: fără liste (pagina publicată fără KV) spune asta, nu „aștept” la nesfârșit", () => {
  assert.match(fnDin(citeste("public", "app.js"), "tbListeRadarHtml"), /tbListe\.la>0\?"listele de azi nu sunt disponibile aici"/);
});

// ───────────── 4. golul rămas ─────────────
await test("4. „Sugestii de acțiuni · Trend 12 luni” în .acTine sub „Ce aș cumpăra azi” (rândul 3, col. 2–3), „Boții tăi” pe trei rânduri; ordinea de pe telefon rămâne", () => {
  const idx = citeste("public", "index.html"), css = citeste("public", "app.css");
  assert.match(idx, /<div class="acLegatura acCumpar" id="acCumpar"><\/div><div class="acBloc acTrendSus" id="acTrendZi"><\/div><\/div>/);
  assert.equal(idx.split('id="acTrendZi"').length - 1, 1);
  assert.match(css, /#dash \.acTine\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:auto auto 1fr;align-items:start;gap:8px\}/);
  assert.match(css, /#dash \.acTine>#acBoti\{grid-column:1;grid-row:1 \/ span 3\}#dash \.acTine>#acCumpar\{grid-column:2 \/ 4;grid-row:2\}#dash \.acTine>#acTrendZi\{grid-column:2 \/ 4;grid-row:3\}/);
  assert.match(css, /\.pzDemo #acasa #acTrendZi\{order:31\}/); assert.match(css, /@media \(max-width:640px\)\{\.pzDemo #acasa #acCumpar\{order:15\}\.pzDemo #acasa #acTrendZi\{order:16\}\}/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
