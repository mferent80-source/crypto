// Proba v100.269 (29.10, el: „în pagina botului la Monte Carlo vreau să pui un contor care să numere de câte ori a avut dreptate sau nu,
// gen 1-0, să fie vizibil”) - scorul verdictelor Monte Carlo, din jurnalul pe care colectorul îl ține din 15.10 (o notare pe bot pe zi).
// Regula, scrisă ÎNAINTE de a număra: verdictul = „pe plus” când șansa notată e peste 50%, „pe minus” sub 50%; 50% fix nu se numără.
// A avut dreptate când botul a ieșit așa (totalul la 7 zile sau la închidere, față de cel de la notare). Unitatea intervalului = ZIUA.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }
}
console.log("\nV100.269 · CONTORUL MONTE CARLO (dreptate – greșit)\n");
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href);
const Z = (i) => new Date(Date.UTC(2026, 9, 15) + i * 86400000).toISOString().slice(0, 10);
const e = (id, zi, p, y, extra) => Object.assign({ id: String(id), z: Z(zi), t: Date.UTC(2026, 9, 15) + zi * 86400000, p, cat: "zgomot", total: 0, y }, extra || {});

// mulberry32 - aleatorul casei
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

await test("1 numărătoarea: peste 50% ⇒ „pe plus”, sub 50% ⇒ „pe minus”; 50% fix, expiratele și cele nejudecate nu intră în scor", () => {
  assert.equal(typeof MC.scorMc, "function", "lipsește scorMc");
  const j = [e(1, 0, 0.7, 1), e(2, 0, 0.3, 0), e(3, 1, 0.2, 1), e(4, 1, 0.8, 0), e(5, 2, 0.5, 1), e(6, 2, 0.9, null), e(7, 2, 0.1, 0, { expirat: true }), e(1, 3, 0.66, 1)];
  const s = MC.scorMc(j);
  assert.equal(s.d, 3, "dreptate"); assert.equal(s.g, 2, "greșit"); assert.equal(s.a, 1, "așteaptă"); assert.equal(s.egal, 1, "50% fix");
  assert.equal(s.ultime, "DDGGD", "ultimele, de la vechi la nou");
  assert.deepEqual(s.peBot["1"], { d: 2, g: 0, a: 0 }); assert.deepEqual(s.peBot["6"], { d: 0, g: 0, a: 1 });
  assert.equal(s.zile, 3, "zile cu verdicte judecate (ziua 2 are doar 50% fix și unul în așteptare)");
});
await test("2 pe datele LUI (data/ritmuri.json, doar citire): scorul e numărătoarea făcută independent aici", () => {
  const f = "C:/Users/Cimin/crypto/data/ritmuri.json";
  if (!fs.existsSync(f)) return;
  const j = JSON.parse(fs.readFileSync(f, "utf8")).mcCalibrare || [];
  let d = 0, g = 0, a = 0;
  for (const x of j) { if (x.expirat) continue; if (x.y !== 0 && x.y !== 1) { a++; continue; } if (x.p === 0.5) continue; ((x.p > 0.5 ? 1 : 0) === x.y) ? d++ : g++; }
  const s = MC.scorMc(j);
  assert.deepEqual([s.d, s.g, s.a], [d, g, a]);
  console.log("       (azi, pe toți boții: " + d + " – " + g + ", " + a + " așteaptă)");
});
await test("3 intervalul pe ZILE: pe date fără nicio putere (verdicte la întâmplare, zile cu șoc comun) zice „se vede” cel mult ~6% din rulări", () => {
  const rnd = mulberry32(269), RUL = 2000; let fals = 0, falsDif = 0;
  for (let r = 0; r < RUL; r++) {
    const j = [], zile = 15 + Math.floor(rnd() * 25);
    for (let z = 0; z < zile; z++) {
      const soc = rnd() < 0.5 ? 1 : 0, n = 3 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) { const y = rnd() < 0.7 ? soc : (rnd() < 0.5 ? 1 : 0); j.push(e(r * 100 + k, z, 0.05 + rnd() * 0.9, y)); }
    }
    const s = MC.scorMc(j); if (s.icJos > 0.5 || s.icSus < 0.5) fals++; if (s.difJos > 0 || s.difSus < 0) falsDif++;
  }
  assert.ok(fals / RUL <= 0.065, "„se vede” fals în " + (fals / RUL * 100).toFixed(1) + "% din rulări");
  assert.ok(falsDif / RUL <= 0.065, "față de „mereu pe plus”: „se vede” fals în " + (falsDif / RUL * 100).toFixed(1) + "% din rulări");
  console.log("       (sub H0: " + (fals / RUL * 100).toFixed(1) + "% față de ban, " + (falsDif / RUL * 100).toFixed(1) + "% față de „mereu pe plus”)");
});
await test("4 raportMc poartă scorul și când sunt puține verdicte (sub 30), nu doar după", () => {
  const j = [e(1, 0, 0.7, 1), e(2, 1, 0.3, 1)];
  const r = MC.raportMc(j);
  assert.equal(r.stare, "putine"); assert.ok(r.scor && r.scor.d === 1 && r.scor.g === 1, JSON.stringify(r));
  const mult = Array.from({ length: 40 }, (_, i) => e(i, i % 12, i % 3 ? 0.7 : 0.3, i % 2));
  assert.equal(MC.raportMc(mult).stare, "testat"); assert.ok(MC.raportMc(mult).scor.d + MC.raportMc(mult).scor.g === 40);
});
await test("5 serverul (istoric-bot?action=mcVerdict) păstrează scorul curățat: numere, „D/G”, cel mult 60 de boți; un câmp străin nu trece", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const H = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const peBot = {}; for (let i = 0; i < 70; i++) peBot[String(3000 + i)] = { d: i % 3, g: 1, a: 0, rau: "x" };
  const scor = { d: 59, g: 51, a: 2, egal: 0, zile: 15, medie: 0.54, icJos: 0.47, icSus: 0.61, plus: 65, laInchidere: 110, oreMediana: 0.5, difMedie: -0.05, difJos: -0.2, difSus: 0.08, ultime: "DDGD<script>", peBot, strain: 1 };
  const p = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: H, body: JSON.stringify({ la: 7, boti: {}, calibrare: { stare: "putine", n: 0, zile: 0, scor } }) }), env });
  assert.equal(p.status, 200, await p.clone().text());
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: H }), env });
  const s = (await g.json()).mcVerdict.calibrare.scor;
  assert.ok(s, "scorul s-a pierdut pe server");
  assert.equal(s.d, 59); assert.equal(s.g, 51); assert.equal(s.a, 2); assert.equal(s.icJos, 0.47); assert.equal(s.ultime, "DDGD", "doar D/G");
  assert.deepEqual([s.plus, s.laInchidere, s.oreMediana, s.difJos, s.difSus], [65, 110, 0.5, -0.2, 0.08], "etalonul și locul judecății se pierd pe server");
  assert.equal(Object.keys(s.peBot).length, 60); assert.equal(s.peBot["3069"].d, 0); assert.equal(s.peBot["3069"].rau, undefined); assert.equal(s.strain, undefined);
});

// ---------------------------------------------------------------- pagina botului
const APP = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
const box = { TextRo: globalThis.TextRo, escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])) };
const scorHtml = () => { vm.createContext(box); vm.runInContext(fnApp("tbMcScorHtml"), box); return box.tbMcScorHtml; };
const SCOR = { d: 59, g: 51, a: 2, egal: 0, zile: 15, medie: 0.536, icJos: 0.47, icSus: 0.6, ultime: "DDDDGDDDDD", peBot: { "2576": { d: 0, g: 0, a: 1 }, "2575": { d: 1, g: 0, a: 0 } } };
await test("6 contorul pe pagina botului: „59 – 51” mare, cu ce înseamnă, procentul cu o zecimală, cât așteaptă și botul de acum", () => {
  const h = scorHtml()(SCOR, "2575"), t = h.replace(/<[^>]+>/g, "");
  assert.match(h, /class="tbMcScor"/); assert.match(h, /<b class="tbMcScorCifre"[^>]*>59 – 51<\/b>/);
  assert.match(t, /a avut dreptate de 59 de ori, s-a înșelat de 51 de ori/);
  assert.match(t, /53,6%/); assert.match(t, /2 verdicte așteaptă/); assert.match(t, /pe botul ăsta: 1 – 0/);
  assert.match(scorHtml()({ d: 1, g: 1, a: 1, zile: 2, peBot: {} }, "x").replace(/<[^>]+>/g, ""), /a avut dreptate o dată, s-a înșelat o dată .* 1 verdict așteaptă/, "„o dată” / „1 verdict”");
  assert.match(scorHtml()({ d: 2, g: 0, a: 0, zile: 2, peBot: {} }, "x").replace(/<[^>]+>/g, ""), /a avut dreptate de 2 ori, încă nu s-a înșelat/);
  assert.match(scorHtml()({ d: 0, g: 3, a: 0, zile: 2, peBot: {} }, "x").replace(/<[^>]+>/g, ""), /încă n-a avut dreptate, s-a înșelat de 3 ori/);
  assert.match(t, /încă nu se deosebește de o aruncare de ban/);
  assert.doesNotMatch(t, /NaN|undefined|null/);
});
await test("7 cuvintele după interval: peste 50% tot intervalul ⇒ „nimerește mai des”; sub ⇒ „mai rar”; sub 10 zile ⇒ „încă puține zile”; fără scor ⇒ nimic", () => {
  const f = scorHtml(), t = (s) => f(s, "x").replace(/<[^>]+>/g, "");
  assert.match(t(Object.assign({}, SCOR, { icJos: 0.53, icSus: 0.7 })), /nimerește mai des decât o aruncare de ban/);
  assert.match(t(Object.assign({}, SCOR, { icJos: 0.3, icSus: 0.46 })), /nimerește mai rar decât o aruncare de ban/);
  assert.match(t(Object.assign({}, SCOR, { zile: 6 })), /încă puține zile \(6\)/);
  assert.match(t({ d: 1, g: 0, a: 0, zile: 1, medie: null, icJos: null, icSus: null, ultime: "D", peBot: {} }), /1 – 0/);
  assert.equal(f(null, "x"), ""); assert.equal(f({ d: 0, g: 0, a: 0 }, "x"), "", "fără niciun verdict judecat și nimic în așteptare: nimic");
  assert.match(t({ d: 0, g: 0, a: 3, zile: 0, peBot: {} }), /0 – 0/, "doar în așteptare: 0 – 0 și cât așteaptă");
});
await test("8 rândul Monte Carlo din pagina botului poartă contorul (din raportul colectorului, adus cu verdictul)", () => {
  assert.match(fnApp("tbMcRand"), /scor:typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv\.d&&tbMcKv\.d\.calibrare\?tbMcKv\.d\.calibrare\.scor:null/, "tbMcRand nu dă scorul");
  assert.match(APP, /tbCitMc"><span class="tbCitIc" aria-hidden="true">🎰<\/span><div>'\+tbMcScorHtml\(mc\.scor,b\.id\)\+'<b>/, "rândul nu arată contorul");
  const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.match(css, /\.tbMcScorCifre\{[^}]*font-size:/, "cifrele contorului fără mărime proprie");
  assert.ok(css.indexOf(".tbMcScorCifre") < css.indexOf(".sugPandaTab thead"), "regula nouă după coada fixă a foii");
});

// ---------------------------------------------------------------- auditul Monte Carlo (29.10): etalonul cinstit și unde s-a judecat
// Boții lui trăiesc în mediană 0,5 h ⇒ toate verdictele s-au judecat LA ÎNCHIDERE; iar „mereu pe plus” ar fi nimerit 65 – 46 (mai bine decât 59 – 52).
await test("9 scorMc ține și etalonul „mereu pe plus” (câte au ieșit pe plus), câte s-au judecat la închidere și după câte ore (mediana)", () => {
  const H = 3600000, j = [e(1, 0, 0.7, 1, { laInchidere: true, judecatLa: Date.UTC(2026, 9, 15) + 0.5 * H }), e(2, 0, 0.3, 1, { laInchidere: true, judecatLa: Date.UTC(2026, 9, 15) + 2 * H }),
    e(3, 1, 0.2, 0, { judecatLa: Date.UTC(2026, 9, 16) + 7 * 24 * H }), e(4, 1, 0.8, 1, { laInchidere: true, judecatLa: Date.UTC(2026, 9, 16) + 1 * H })];
  const s = MC.scorMc(j);
  assert.equal(s.plus, 3, "câte au ieșit pe plus"); assert.equal(s.laInchidere, 3); assert.equal(s.oreMediana, 1.5, "mediana orelor până la judecată (0,5 · 1 · 2 · 168)");
  assert.ok(Number.isFinite(s.difJos) && Number.isFinite(s.difSus), "intervalul diferenței față de etalon, pe zile");
});
await test("10 contorul arată etalonul și unde s-a judecat; cuvintele se compară cu „mereu pe plus”, nu cu banul", () => {
  const f = scorHtml(), t = (s) => f(s, "x").replace(/<[^>]+>/g, "");
  const S = Object.assign({}, SCOR, { plus: 65, laInchidere: 110, oreMediana: 0.5, difJos: -0.2, difSus: 0.05 });
  assert.match(t(S), /„mereu pe plus” ar fi nimerit 65 – 45/);
  assert.match(t(S), /judecate la închiderea botului \(mediana după 0,5 h\), nu la 7 zile/);
  assert.match(t(S), /încă nu bate „mereu pe plus”/);
  assert.doesNotMatch(t(S), /aruncare de ban/, "etalonul e regula fixă, nu banul");
  assert.match(t(Object.assign({}, S, { difJos: 0.02, difSus: 0.2 })), /nimerește mai des decât „mereu pe plus”/);
  assert.match(t(Object.assign({}, S, { difJos: -0.3, difSus: -0.05 })), /nimerește mai rar decât „mereu pe plus”/);
  assert.match(t(Object.assign({}, S, { laInchidere: 10, oreMediana: 170 })), /judecate la 7 zile sau la închidere/, "puține la închidere ⇒ textul obișnuit");
});

// ---------------------------------------------------------------- auditul Monte Carlo: riscul pe termen scurt (1 h / 4 h / 1 zi)
// Boții lui trăiesc în mediană 0,5 h; pe 1 h / 4 h / 1 zi „pe plus X%” nu spune mai mult decât media (auditul, reluare pe 73 de monede),
// dar șansa STOPULUI și pierderea din cele mai proaste 5% sunt calibrate în medie ⇒ pe termen scurt se arată RISCUL, nu „câștigă”.
for (const f of ["monte-simbol.js", "grid-calcul.js", "grid-proba.js", "grid-sim.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"));
const GS = globalThis.GridSim;
const bare15 = (() => { const r = mulberry32(7), b = []; let p = 100; for (let i = 0; i < 31 * 96; i++) { const o = p; p *= Math.exp((r() - 0.5) * 0.012); b.push({ t: Date.UTC(2026, 8, 28) + i * 9e5, o, h: Math.max(o, p) * 1.001, l: Math.min(o, p) * 0.999, c: p, v: 1 }); } return b; })();
const ST = { jos: 92, sus: 108, grile: 25, levier: 5, dir: "short", suma: 160, fundingZi: 0.0003, fundingCost: true, stop: { sus: 106 } };
await test("11 simulatorul dă orizonturile de 1 h și 4 h pe bare întregi (4 și 16), cu cifre finite - 4/24 · 96 nu mai cade între bare", () => {
  const r = GS.simuleaza(bare15, ST, { n: 300, seed: 12, orizonturi: [1 / 24, 4 / 24, 1, 7], zile: 14 });
  assert.ok(!r.eroare, r.eroare);
  assert.deepEqual(r.orizonturi.map((o) => o.bare), [4, 16, 96, 672]);
  for (const o of r.orizonturi) assert.ok(Number.isFinite(o.p5) && Number.isFinite(o.pStop) && Number.isFinite(o.pLich), JSON.stringify({ z: o.zile, p5: o.p5, pStop: o.pStop }));
});
await test("12 GridSim.riscScurt: 1 h / 4 h / o zi - șansa stopului, a lichidării și cele mai proaste 5% (de aici încolo, la botul care rulează)", () => {
  assert.equal(typeof GS.riscScurt, "function", "lipsește GridSim.riscScurt");
  const r = GS.simuleaza(bare15, ST, { n: 300, seed: 12, orizonturi: [1 / 24, 4 / 24, 1, 7], zile: 14 }), s = GS.riscScurt(r);
  assert.deepEqual(s.map((x) => x.ore), [1, 4, 24]);
  assert.ok(s.every((x) => x.pStop >= 0 && x.pStop <= 1 && Number.isFinite(x.p5)));
  assert.ok(s[0].pStop <= s[1].pStop && s[1].pStop <= s[2].pStop, "stopul nu poate fi mai rar într-o zi decât într-o oră");
  const cuAcum = { orizonturi: [{ zile: 1 / 24, pStop: 0.1, pLich: 0, p5: -9, deAici: { p5: -2 } }] };
  assert.equal(GS.riscScurt(cuAcum)[0].p5, -2, "la botul care rulează contează pierderea DE AICI ÎNCOLO");
  assert.deepEqual(GS.riscScurt({ orizonturi: [{ zile: 1, pStop: 0.2 }, { zile: 7, pStop: 0.5 }] }).map((x) => x.ore), [24], "fără orizonturile scurte: doar ce există");
  assert.deepEqual(GS.riscScurt(null), []);
});
await test("13 colectorul și pagina botului cer orizonturile scurte; colectorul pune riscul în verdictul fiecărui bot", async () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs"), "utf8");
  assert.match(col, /orizonturi: \[1 \/ 24, 4 \/ 24, 1, 7\]/);
  const M = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href + "?t=" + Date.now());
  const st = { boti: {} }, b = { id: 2601, activ: true, baza: "SOL", gridJos: 92, gridSus: 108, investit: 160, levier: 5, directie: "short", brut: {} };
  await M.turaMonteCarloBot({ boti: [b], GridSim: GS, GridCalcul: globalThis.GridCalcul, stare: st, n: 200, randuri15: async () => bare15.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: 1 })),
    simbol: () => "SOL_USDT_PERP", jurnal: () => {}, anunta: async () => true });
  const v = st.boti["2601"];
  assert.ok(v, "botul n-a fost simulat: " + JSON.stringify(st));
  assert.ok(Array.isArray(v.scurt) && v.scurt.length === 3 && v.scurt[0].ore === 1, "riscul scurt lipsește din verdict: " + JSON.stringify(v.scurt));
  const app = APP; assert.equal((app.match(/orizonturi:\[1\/24,4\/24,1,7\]/g) || []).length, 2, "pagina botului (ambele socotiri) cere orizonturile scurte");
});
await test("14 serverul păstrează riscul scurt al fiecărui bot curățat (cel mult 3 rânduri, ore 1 / 4 / 24, numere)", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "b");
  const H = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const scurt = [{ ore: 1, pStop: 0.02, pLich: 0, p5: -1.2, rau: 1 }, { ore: 4, pStop: 0.07, pLich: 0, p5: -2.1 }, { ore: 24, pStop: 0.21, pLich: 0.004, p5: -4.4 }, { ore: 99, pStop: 1 }];
  await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: H, body: JSON.stringify({ la: 7, boti: { "2601": { cat: "zgomot", stare: "atentie", text: "t", la: 1, ultima: 2, scurt } } }) }), env });
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: H }), env });
  const s = (await g.json()).mcVerdict.boti["2601"].scurt;
  assert.deepEqual(s, [{ ore: 1, pStop: 0.02, pLich: 0, p5: -1.2 }, { ore: 4, pStop: 0.07, pLich: 0, p5: -2.1 }, { ore: 24, pStop: 0.21, pLich: 0.004, p5: -4.4 }]);
});
await test("15 pe pagina botului: rândul riscului pe termen scurt (riscul, nu câștigul), procente cu o zecimală, USDT cu minus „−”", () => {
  const box2 = { TextRo: globalThis.TextRo, escapeHtml: box.escapeHtml }; vm.createContext(box2); vm.runInContext(fnApp("tbMcScurtHtml"), box2);
  const h = box2.tbMcScurtHtml([{ ore: 1, pStop: 0.02, pLich: 0, p5: -1.234 }, { ore: 4, pStop: 0.07, pLich: 0, p5: -2.1 }, { ore: 24, pStop: 0.213, pLich: 0.004, p5: -4.44 }]), t = h.replace(/<[^>]+>/g, "");
  assert.match(t, /^Pe termen scurt \(riscul, nu câștigul\): stopul atins în 1 h: 2,0% · în 4 h: 7,0% · într-o zi: 21,3%/);
  assert.match(t, /cele mai proaste 5% într-o zi: −4,4 USDT/); assert.match(t, /lichidare într-o zi: 0,4%/);
  assert.equal(box2.tbMcScurtHtml(null), ""); assert.equal(box2.tbMcScurtHtml([]), "");
  assert.match(APP, /tbMcScurtHtml\(mc\.scurt\)/, "rândul Monte Carlo nu arată riscul scurt");
  assert.match(fnApp("tbMcRand"), /scurt:tbMc\.rand\.scurt\|\|null/, "tbMcRand nu dă riscul scurt");
});
await test("16 textul calibrării spune unde s-a judecat (la închidere, mediana după X h), nu „judecate după 7 zile”", () => {
  const t = GS.textCalibrareMc({ stare: "putine", n: 111, zile: 15, scor: { laInchidere: 111, oreMediana: 0.5, d: 59, g: 52 } });
  assert.doesNotMatch(t, /judecate după 7 zile/); assert.match(t, /judecate la închiderea botului \(mediana după 0,5 h\)/);
  const t2 = GS.textCalibrareMc({ stare: "testat", n: 40, zile: 12, brier: 0.3, brierBan: 0.25, cutii: [], scor: { laInchidere: 111, oreMediana: 0.5, d: 59, g: 52 } });
  assert.doesNotMatch(t2, /se suprapun \(7 zile\)/); assert.match(t2, /la închiderea botului/);
  assert.match(GS.textCalibrareMc({ stare: "putine", n: 3 }), /judecate după 7 zile sau la închidere/, "fără scor: textul vechi, dar cinstit");
});

await test("17 judecata la închidere pe ACEEAȘI bază ca notarea (totalul botului = echitate − investit), nu netul cu comisionul de închidere", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n");
  const i = col.indexOf("function judecaMcInchis("), f = col.slice(i, col.indexOf("\n}\n", i));
  assert.ok(i > 0, "lipsește judecaMcInchis");
  /* revizia independentă: bot-orders dă profitTotal null când lipsesc datele - Number(null) = 0 ar fi judecat verdictul pe 0 */
  assert.match(f, /pt = x\.profitTotal === null \|\| x\.profitTotal === undefined \|\| x\.profitTotal === "" \? NaN : Number\(x\.profitTotal\)/, "null trebuie să cadă pe net, nu pe 0");
  assert.match(f, /final = Number\.isFinite\(pt\) \? pt :/, "totalul botului are întâietate față de netul din jurnal");
});

await test("18 „pe botul ăsta”: un bot care rulează de mult (notat și azi) rămâne printre cei 60 păstrați, nu iese după prima lui notare", () => {
  const j = [e(9999, 0, 0.7, null)]; for (let i = 0; i < 70; i++) j.push(e(5000 + i, 1 + (i % 8), 0.6, 1));
  j.push(e(9999, 9, 0.7, null));
  const s = MC.scorMc(j);
  assert.ok(s.peBot["9999"], "botul vechi, notat și azi, a ieșit din cei 60"); assert.equal(s.peBot["9999"].a, 2);
  assert.equal(Object.keys(s.peBot).length, 60);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
