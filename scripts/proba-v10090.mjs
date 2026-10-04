// Proba v100.90 / colector v101.60 (04.10, el: „continuă” pe designul colaborării 2 cu Busola, partea Radarului):
// (1) grid.futures în cifra pazei și în fișă (boții sunt pe futures), cu fallback pe grid; (2) I-514 rândul gri din fișă cu intervalul
// măsurat de Busola (fisa4h), scalat ×/÷1000 când botul e pe „1000X” și fișa nu (sau invers); (3) I-513 eticheta Busolei pe bot
// („mai agitată ca de obicei · de 8 h · măsurat acum 2 h”), „de” ținut de colector PE MONEDĂ și trimis serverului (ruta `paza`), rândul în
// rezumatul de dimineață; (4) I-515 fișierul local data/pentru-busola.json (boți deschiși + închișii din 90 de zile, pnlPct NET, retea: []).
// Revizia Opus (04.10): cheia Busolei vine din tickerul Pionex (LIGHTER.PERP ⇒ LIT), nu din numele botului; pnlPct din NET; „de” doar
// când starea din KV e aceeași cu cea de pe pagină; „de” necunoscut la prima vedere; garda cu futures chiar produce text.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const B = new Function(`${lib("busola.js")}; return Busola;`)();
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
const P = await import("./lib/paza-boti.mjs");
const PB = await import("./lib/pentru-busola.mjs").catch((e) => ({ lipsa: e.message }));
const TD = await import("./lib/tura-dimineata.mjs");
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.90 · Busola ↔ Radar, pasul 2: futures, fișa de 4h, eticheta pe bot, fișierul pentru Busola");
// rutele din functions/api, chemate direct cu un KV fals (ca în proba-v10085-colector)
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async () => ({ keys: [] }) }; }
const TOKEN = "token-de-proba-v10090";
async function cheama(fis, metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", fis)).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.90", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/" + fis.replace(/\.js$/, "") + "?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}

const ORA = 3600000, ZI = 86400000, ACUM = Date.UTC(2026, 9, 4, 0, 0), LA = ACUM - 2 * ORA, FISA_LA = Date.UTC(2026, 9, 3, 20, 0);
const HM = new Date(FISA_LA).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
const FUT = { canal: "±2×ATR", comision: { start: 0.0005, grila: 0.0002, iesire: 0.0005 }, dovedit: false, miscareDovedita: true, liniste: -0.0081966036, oricand: -0.0094983709, miscare: -0.011375026 };
const REZ = (o) => Object.assign({ la: LA, versiune: "1.40.1",
  monede: { AAVE: { "4h": "nu-stiu", grid4h: "miscare", fisa4h: { jos: 159.35, sus: 201.927, linii: 17 } }, BONK: { grid4h: "liniste", fisa4h: { jos: 0.00000327393, sus: 0.0000043873, linii: 17 } },
    SHIB: { perp4h: "nu-stiu", fisa4h: { jos: 0.0081, sus: 0.0102, linii: 17, simbol: "1000SHIB" } }, PEPE: { grid4h: "nu-stiu", fisa4h: { jos: 0.0000038053, sus: 0.00000485352, linii: 17 } },
    LIT: { perp4h: "miscare" }, PUMP: { perp4h: "nu-stiu" }, SOL: { perp4h: "nemasurat" } },
  grid: { interval: "4h", canal: "±2×ATR", miscare: -0.011341049, liniste: -0.0081260081, oricand: -0.0094456786, dovedit: true, miscareDovedita: true, canal4h: "+4,2/−3,9 ATR", fisa4hLa: FISA_LA, futures: FUT },
  perp: { la: LA, monede: 102, prag: 200000, sursa: "Pionex PERP 4h", bareMediane: 1999 } }, o || {});
const faraFutures = () => { const r = REZ(); r.grid = { ...r.grid }; delete r.grid.futures; return r; };
const cuFutures = (f) => REZ({ grid: { ...REZ().grid, futures: f } });

// ---- (1) grid.futures ----
await test("(1) cifra pazei vine din grid.futures când există („futures ±2×ATR”, aceeași lungime ca „grid pe ±2×ATR” - garda de 160); fără bloc sau bloc PARȚIAL ⇒ grid; dovada DOAR din blocul folosit", () => {
  assert.equal(B.cifraMiscare(REZ()), "−1,138% pe episod, futures ±2×ATR, dovedit");
  assert.equal(B.cifraMiscare(faraFutures()), "−1,134% pe episod, grid pe ±2×ATR, dovedit");
  const f = { ...FUT }; delete f.miscareDovedita; assert.equal(B.cifraMiscare(cuFutures(f)), "−1,138% pe episod, futures ±2×ATR", "futures fără miscareDovedita ⇒ nimic despre dovadă, nici din grid");
  assert.equal(B.cifraMiscare(cuFutures({ canal: "±2×ATR" })), "−1,134% pe episod, grid pe ±2×ATR, dovedit", "futures fără cifră ⇒ grid");
  assert.equal(B.cifraMiscare(cuFutures({ canal: "±2×ATR", miscare: -0.011375026, miscareDovedita: true })), "−1,134% pe episod, grid pe ±2×ATR, dovedit", "bloc parțial (fără liniste/oricand - Busola pune NaN pe grup) ⇒ grid, ca fișa să nu scrie „(?)”");
});
await test("(1) fișa de grid: cifrele și dovada din grid.futures - mișcare −1,138% cu nota „futures ±2×ATR”; liniște NEdovedită pe futures (−0,820%, „ceva mai puțin”); fără bloc ⇒ ca până acum", () => {
  const m = B.randGrid(REZ(), "AAVE_USDT_PERP", ACUM); assert.equal(m.nivel, "atentie"); assert.match(m.text, /−1,138% pe episod/); assert.equal(m.nota, "futures ±2×ATR");
  const l = B.randGrid(REZ(), "BONK", ACUM); assert.equal(l.nivel, "info"); assert.match(l.text, /ceva mai puțin decât oricând \(−0,820%\)/); assert.equal(l.nota, "futures ±2×ATR, nedovedit");
  const v = B.randGrid(faraFutures(), "BONK", ACUM); assert.match(v.text, /cel mai puțin \(−0,813%\)/); assert.equal(v.nota, "grid pe ±2×ATR, dovedit");
});

// ---- (2) I-514 fișa de 4h ----
await test("(2) randFisa: AAVE ⇒ „Busola, măsurat (4h, +4,2/−3,9 ATR, la prețul de la HH:MM): jos 159.35 · sus 201.927 · 17 linii”; vechi de peste 6 h ⇒ „· măsurat acum 7 h”; fără fisa4h / fără rezumat ⇒ null", () => {
  assert.equal(typeof B.randFisa, "function", "lipsește Busola.randFisa");
  const r = B.randFisa(REZ(), "AAVE_USDT_PERP", ACUM, String);
  assert.equal(r.text, "Busola, măsurat (4h, +4,2/−3,9 ATR, la prețul de la " + HM + "): jos 159.35 · sus 201.927 · 17 linii");
  assert.deepEqual([r.jos, r.sus, r.linii, r.factor], [159.35, 201.927, 17, 1]);
  assert.ok(B.randFisa(REZ({ la: ACUM - 7 * ORA }), "AAVE", ACUM, String).text.endsWith("· 17 linii · măsurat acum 7 h"), "rezumatul vechi își spune vârsta");
  assert.equal(B.randFisa(REZ(), "LIT_USDT_PERP", ACUM, String), null); assert.equal(B.randFisa(null, "AAVE", ACUM, String), null); assert.equal(B.randFisa({ monede: {} }, "AAVE", ACUM, String), null);
  const g = { ...REZ().grid }; delete g.canal4h; delete g.fisa4hLa;
  assert.equal(B.randFisa(REZ({ grid: g }), "AAVE", ACUM, String).text, "Busola, măsurat (4h): jos 159.35 · sus 201.927 · 17 linii", "fără canal și fără oră ⇒ paranteza scurtă");
  assert.ok(B.randFisa(REZ(), "AAVE", ACUM, (x) => x.toFixed(2)).text.endsWith(": jos 159.35 · sus 201.93 · 17 linii"), "prețurile prin formatatorul fișei");
});
await test("(2) unitățile (Busola 1.40.1): bot pe 1000BONK cu fișa spot BONK ⇒ ×1000; bot pe SHIB cu fișa „1000SHIB” ⇒ ÷1000; 1000SHIB pe 1000SHIB și PEPE pe PEPE ⇒ neschimbate; 1000000PEPE ⇒ ×1.000.000", () => {
  const b = B.randFisa(REZ(), "1000BONK_USDT_PERP", ACUM, String); assert.deepEqual([b.jos, b.sus, b.factor], [0.00327393, 0.0043873, 1000]); assert.match(b.text, /jos 0\.00327393 · sus 0\.0043873 · 17 linii$/);
  const s = B.randFisa(REZ(), "SHIB_USDT_PERP", ACUM, String); assert.deepEqual([s.jos, s.sus, s.factor], [0.0000081, 0.0000102, 0.001]);
  const s2 = B.randFisa(REZ(), "1000SHIB_USDT_PERP", ACUM, String); assert.deepEqual([s2.jos, s2.sus, s2.factor], [0.0081, 0.0102, 1]);
  const p = B.randFisa(REZ(), "PEPE_USDT_PERP", ACUM, String); assert.deepEqual([p.jos, p.sus, p.factor], [0.0000038053, 0.00000485352, 1]);
  const m = B.randFisa(REZ(), "1000000PEPE_USDT_PERP", ACUM, String); assert.deepEqual([m.jos, m.sus, m.factor], [3.8053, 4.85352, 1000000], "multiplicatorul se citește, nu se presupune 1000");
});

// ---- (3) I-513 eticheta + rândul de dimineață ----
await test("(3) eticheta pe bot: starea din rezumat, „de N h” DOAR când starea din KV e aceeași; „nu urmărește” ≠ „n-a putut măsura”; 1000PEPE ⇒ PEPE; fără rezumat ⇒ null", () => {
  assert.equal(typeof B.eticheta, "function", "lipsește Busola.eticheta");
  assert.deepEqual(B.eticheta(REZ(), "AAVE_USDT_PERP", ACUM, { stare: "miscare", de: ACUM - 8 * ORA }), { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "de 8 h · măsurat acum 2 h" });
  assert.deepEqual(B.eticheta(REZ(), "AAVE", ACUM, { stare: "liniste", de: ACUM - 8 * ORA }), { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "măsurat acum 2 h" }, "KV-ul e pe altă stare (rezumate defazate) ⇒ fără „de”");
  assert.deepEqual(B.eticheta(REZ(), "AAVE", ACUM, { stare: "miscare", de: null }), { stare: "miscare", nivel: "atentie", text: "mai agitată ca de obicei", nota: "măsurat acum 2 h" }, "„de” necunoscut (prima vedere) ⇒ fără „de”");
  assert.deepEqual(B.eticheta(REZ(), "BONK", ACUM, null), { stare: "liniste", nivel: "info", text: "mai calmă ca de obicei", nota: "măsurat acum 2 h" });
  assert.deepEqual(B.eticheta(REZ(), "PUMP_USDT_PERP", ACUM, { stare: "nu-stiu", de: ACUM - 30 * 60000 }), { stare: "nu-stiu", nivel: "neutru", text: "nimic neobișnuit", nota: "de 30 min · măsurat acum 2 h" });
  assert.deepEqual(B.eticheta(REZ(), "SOL", ACUM, null), { stare: null, nivel: "nemasurat", text: "n-a putut măsura moneda", nota: "măsurat acum 2 h" });
  assert.deepEqual(B.eticheta(REZ(), "DOGE", ACUM, null), { stare: null, nivel: "nemasurat", text: "nu urmărește moneda", nota: "măsurat acum 2 h" });
  assert.equal(B.eticheta(REZ(), "1000PEPE.PERP", ACUM, null).stare, "nu-stiu"); assert.equal(B.eticheta(null, "AAVE", ACUM, null), null);
});
await test("(3) rândul boților (portofoliu + dimineață): „AAVE mai agitată de 8 h · LIT mai calmă de 2,5 h · PUMP nimic neobișnuit · SOL nemăsurată”; gol ⇒ null; prea lung ⇒ fără durate, apoi „+N”, sub 145", () => {
  assert.equal(typeof B.liniaBoti, "function", "lipsește Busola.liniaBoti");
  assert.equal(B.liniaBoti([{ nume: "AAVE", stare: "miscare", de: ACUM - 8 * ORA }, { nume: "LIT", stare: "liniste", de: ACUM - 2.5 * ORA }, { nume: "PUMP", stare: "nu-stiu", de: null }, { nume: "SOL", stare: null }], ACUM),
    "AAVE mai agitată de 8 h · LIT mai calmă de 2,5 h · PUMP nimic neobișnuit · SOL nemăsurată");
  assert.equal(B.liniaBoti([], ACUM), null); assert.equal(B.liniaBoti(null, ACUM), null);
  const multi = Array.from({ length: 12 }, () => ({ nume: "MARSCOIN", stare: "miscare", de: ACUM - 8 * ORA })), l = B.liniaBoti(multi, ACUM);
  assert.ok(l.length <= 145, l); assert.ok(l.includes("MARSCOIN mai agitată") && !l.includes("de 8 h"), l); assert.match(l, / · \+\d+$/);
  const n = (l.match(/MARSCOIN/g) || []).length, plus = Number(l.match(/\+(\d+)$/)[1]); assert.equal(n + plus, 12, "nimeni pierdut: " + l);
});
await test("(3) paza: cheia din tickerul Pionex (LIGHTER.PERP + simbolPionex LIT_USDT_PERP ⇒ LIT), nu din numele botului; titlul rămâne cu numele botului", () => {
  const bot = { id: "b9", baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", directie: "short", levier: 4, gridJos: 4.2, gridSus: 5.1, pornitLa: ACUM - 5 * ORA };
  const d = P.pazaBot({ Busola: B, rez: REZ(), bot, inainte: { stare: "liniste", la: 1, de: 1 }, acum: ACUM, pret: A.pret });
  assert.equal(d.tine, true); assert.equal(d.stare.stare, "miscare", "LIT e în mișcare în rezumat; cu cheia LIGHTER ar fi null"); assert.equal(d.cheie, "LIT");
  assert.ok(d.mesaj, "trecerea trebuie să sune"); assert.equal(d.mesaj.titlu, "LIGHTER short 4× · Busola: mai agitată ca de obicei");
  assert.equal(P.pazaBot({ Busola: B, rez: REZ(), bot: { ...bot, simbolPionex: undefined }, inainte: null, acum: ACUM, pret: A.pret }).stare.stare, null, "fără ticker rămâne numele (LIGHTER nu e în rezumat)");
});
await test("(3) paza: „de” PE MONEDĂ - prima vedere ⇒ necunoscut (null); trecere văzută ⇒ ora rezumatului; aceeași stare ⇒ rămâne; fără hartă ⇒ ca până acum, pe bot; pazaPas scrie harta doar după ce mesajul a plecat", async () => {
  const bot = { id: "b1", baza: "AAVE.PERP", directie: "long", levier: 5, gridJos: 150, gridSus: 200, pornitLa: ACUM - 5 * ORA }, pb = (o) => P.pazaBot({ Busola: B, rez: REZ(), bot, inainte: { stare: "liniste", la: 1, de: 1 }, acum: ACUM, pret: A.pret, ...o });
  assert.deepEqual(pb({ monede: {} }).stare, { stare: "miscare", la: LA, de: null }, "prima vedere a monedei ⇒ „de” necunoscut, nu ora de acum");
  assert.deepEqual(pb({ monede: { AAVE: { stare: "liniste", de: 5 } } }).stare, { stare: "miscare", la: LA, de: LA }, "trecere văzută ⇒ de = ora rezumatului");
  assert.deepEqual(pb({ monede: { AAVE: { stare: "miscare", de: ACUM - 8 * ORA } } }).stare, { stare: "miscare", la: LA, de: ACUM - 8 * ORA }, "aceeași stare ⇒ „de” vechi");
  assert.deepEqual(pb({ monede: { AAVE: { stare: "miscare", de: null } } }).stare, { stare: "miscare", la: LA, de: null }, "aceeași stare, „de” necunoscut ⇒ rămâne necunoscut");
  assert.deepEqual(pb({}).stare, { stare: "miscare", la: LA, de: LA }, "fără hartă (probele vechi) ⇒ regula pe bot");
  const monede = { AAVE: { stare: "liniste", de: 5 } }, st = { _busola: { stare: "liniste", la: 1, de: 5 } }, trimise = [];
  const pas = (ok2) => P.pazaPas({ Busola: B, rez: REZ(), bot, st, acum: ACUM, pret: A.pret, monede, trimite: async (m) => { trimise.push(m.titlu); return ok2; } });
  await pas(false); assert.deepEqual(monede.AAVE, { stare: "liniste", de: 5 }, "mesaj picat ⇒ harta neatinsă"); assert.deepEqual(st._busola, { stare: "liniste", la: 1, de: 5 });
  await pas(true); assert.deepEqual(monede.AAVE, { stare: "miscare", de: LA }); assert.deepEqual(st._busola, { stare: "miscare", la: LA, de: LA }); assert.equal(trimise.length, 2);
  assert.equal(typeof P.pentruServer, "function", "lipsește pentruServer");
  assert.deepEqual(P.pentruServer([bot, { id: "b2", baza: "LIT.PERP" }, { id: "b3" }], { b1: st, b2: { lich: {} } }, ACUM), { la: ACUM, boti: { b1: { stare: "miscare", la: LA, de: LA } } });
});
await test("(3) ruta `paza` (KV): POST curăță (cheie invalidă aruncată, stare necunoscută ⇒ null, câmpuri străine aruncate, cel mult 60 de boți); GET o întoarce; înainte de primul POST ⇒ null", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.deepEqual((await cheama("istoric-bot.js", "GET", "action=paza", env)).d, { paza: null });
  const boti = { "a b": { stare: "liniste", de: 1, la: 2 }, b0: { stare: "miscare", de: 10, la: 20, rau: "x" }, b1: { stare: "zzz", de: "7", la: null } };
  for (let i = 2; i < 70; i++) boti["b" + i] = { stare: "liniste", de: 1, la: 2 };
  assert.equal((await cheama("istoric-bot.js", "POST", "action=paza", env, { la: 5, boti, rau: 1 })).status, 200);
  const g = (await cheama("istoric-bot.js", "GET", "action=paza", env)).d.paza;
  assert.equal(g.la, 5); assert.deepEqual(g.boti.b0, { stare: "miscare", de: 10, la: 20 }); assert.deepEqual(g.boti.b1, { stare: null, de: 7, la: null });
  assert.ok(Object.keys(g.boti).length <= 60, "plafon: " + Object.keys(g.boti).length); assert.ok(!("a b" in g.boti) && !("ab" in g.boti) && !("rau" in g), "cheia invalidă (prima) e aruncată, nu „reparată”");
});
await test("(3) rezumatul de dimineață: rândurile extra ale colectorului (`liniiExtra`) intră după rândurile Consilierului", async () => {
  const trimise = [];
  const r = await TD.turaDimineata({ acum: Date.UTC(2026, 9, 4, 7, 0), stare: {}, jurnal: () => {}, Consilier: { rezumatDimineata: () => ({ titlu: "Dimineața", linii: ["📈 Piața: liniște"] }) },
    date: async () => ({ liniiExtra: ["Busola, pe 4h: AAVE mai agitată de 8 h"] }), trimite: async (m) => { trimise.push(m); return true; } });
  assert.equal(r.trimis, true); assert.equal(trimise[0].mesaj, "📈 Piața: liniște\nBusola, pe 4h: AAVE mai agitată de 8 h");
});

// ---- (4) I-515 fișierul pentru Busola ----
await test("(4) pentru-busola: deschiși (cheia din simbolPionex: LIGHTER ⇒ LIT) + închișii din 90 de zile (cheia prin `cheia`: PUMPFUN ⇒ PUMP), pnlPct din NET / banii puși, levier lipsă ⇒ null, „LONG” ⇒ long, ms UTC, retea: [], ordonați după pornire", () => {
  assert.ok(!PB.lipsa, "lipsește scripts/lib/pentru-busola.mjs: " + PB.lipsa);
  const deschisi = [{ id: 2397, baza: "AAVE.PERP", simbolPionex: "AAVE_USDT_PERP", directie: "long", levier: 5, pornitLa: ACUM - 30 * ORA, activ: true },
    { id: 2400, baza: "1000PEPE.PERP", directie: "no_trend", levier: "3", pornitLa: ACUM - ORA }, { id: 2402, baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", directie: "LONG", levier: null, pornitLa: ACUM - 2 * ORA }, { baza: "X.PERP", pornitLa: ACUM }];
  const inchisi = [{ id: "s1", moneda: "CRV", dir: "long", levier: 5, investit: 49.67, pus: 49.67, pornit: ACUM - 10 * ZI, inchis: ACUM - 9 * ZI, rezultat: 2.4835, comisioane: -1.2, funding: -0.3, net: 0.9835 },
    { id: "s2", moneda: "1000BONK", dir: "short", levier: 4, investit: 100, pus: 120, pornit: ACUM - 100 * ZI, inchis: ACUM - 95 * ZI, rezultat: -6, net: -7 },
    { id: "s3", moneda: "LIT", dir: "short", levier: 4, investit: 0, pus: 0, pornit: ACUM - 3 * ZI, inchis: ACUM - 2 * ZI, rezultat: -1.5, net: -1.9 },
    { id: "s4", moneda: "PUMPFUN", dir: "long", levier: 2, investit: 60, pus: 60, pornit: ACUM - 5 * ZI, inchis: ACUM - 4 * ZI, rezultat: 3 }];
  const cheia = (m) => ({ PUMPFUN: "PUMP_USDT_PERP" })[m] || m;
  assert.deepEqual(PB.alcatuieste({ la: ACUM, versiune: "v101.60", deschisi, inchisi, acum: ACUM, Busola: B, cheia }), { la: ACUM, versiune: "v101.60", retea: [], boti: [
    { id: "2400", simbol: "PEPE", directie: "neutru", levier: 3, pornit: ACUM - ORA, inchis: null, pnlPct: null },
    { id: "2402", simbol: "LIT", directie: "long", levier: null, pornit: ACUM - 2 * ORA, inchis: null, pnlPct: null },
    { id: "2397", simbol: "AAVE", directie: "long", levier: 5, pornit: ACUM - 30 * ORA, inchis: null, pnlPct: null },
    { id: "s3", simbol: "LIT", directie: "short", levier: 4, pornit: ACUM - 3 * ZI, inchis: ACUM - 2 * ZI, pnlPct: null },
    { id: "s4", simbol: "PUMP", directie: "long", levier: 2, pornit: ACUM - 5 * ZI, inchis: ACUM - 4 * ZI, pnlPct: null },
    { id: "s1", simbol: "CRV", directie: "long", levier: 5, pornit: ACUM - 10 * ZI, inchis: ACUM - 9 * ZI, pnlPct: 1.98 } ] });
  assert.equal(PB.alcatuieste({ la: ACUM, versiune: "v", deschisi: null, inchisi: undefined, acum: ACUM, Busola: B }).boti.length, 0);
});

// ---- legarea ----
await test("(5) pagina: rândul Busolei sub „Număr de grile” în fișă (grBusolaFisaHtml); eticheta în „Acum” cu cheia din tickerul Pionex și KV-ul întreg (starea + de); portofoliul cu „de” doar pe aceeași stare", () => {
  const a = citeste("public", "app.js");
  assert.ok(/^function grBusolaFisaHtml\(f,i\)\{/m.test(a), "lipsește grBusolaFisaHtml"); assert.ok(/\+grBusolaFisaHtml\(f,i\)\s*\n\s*\+grRand\("Levier"/.test(a), "rândul nu e sub „Număr de grile”");
  assert.ok(/^function tbCheieBusola\(b\)\{return b\.simbolPionex\|\|TabloBot\.simboluri\(b\.baza,b\.quote\)\.pionex\}/m.test(a), "lipsește tbCheieBusola (tickerul Pionex, nu numele botului)");
  assert.ok(/^function tbBusolaLinie\(b\)\{/m.test(a) && /^function tbPazaAdu\(\)\{/m.test(a) && a.includes('getJSON("/api/istoric-bot?action=paza")'), "lipsește tbBusolaLinie / tbPazaAdu");
  assert.ok(a.includes("Busola.eticheta(Busola.rezumat(),tbCheieBusola(b),Date.now(),tbPazaKv.boti[b.id])"), "eticheta primește cheia Pionex și KV-ul întreg");
  const ex = a.slice(a.indexOf("function tbDeseneazaExtra(b){"), a.indexOf("\nfunction tbDeseneazaBanii(")); assert.ok(/h\+=tbBusolaLinie\(b\);/.test(ex), "eticheta nu e în tbDeseneazaExtra");
  const po = a.slice(a.indexOf("function tbDeseneazaPortofoliu(){"), a.indexOf("\n// v97.8")); assert.ok(po.includes("Busola, pe 4h") && po.includes("Busola.liniaBoti(") && po.includes("tbCheieBusola(b)") && po.includes("k.stare===s.stare"), "portofoliul: cheia Pionex + „de” doar pe aceeași stare");
});
await test("(5) colectorul: `de` pe monedă (meta().busolaMonede), starea la server după bucla boților, fișierul pentru Busola (închișii: 90 de zile ÎNAINTE de jurnal, uniți cu lista de dinainte; cheia prin lista Pionex), rândul de dimineață, v101.60; proba de încărcare", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.ok(/import \{ pazaPas, notaVeche, pentruServer \} from "\.\/lib\/paza-boti\.mjs";/.test(c), "importul pentruServer");
  assert.ok(/import \{ alcatuieste as pentruBusola \} from "\.\/lib\/pentru-busola\.mjs";/.test(c), "importul pentru-busola");
  assert.ok(c.includes("monede: meta().busolaMonede || (meta().busolaMonede = {})"), "harta „de” pe monedă, ținută în starea alertelor");
  assert.ok(c.includes('await trimite("/api/istoric-bot?action=paza", pentruServer(boti, stareAlerte, acum));'), "POST-ul paza");
  assert.ok(c.includes('path.join(DATA, "pentru-busola.json")') && /scrieAtomic\(PENTRU_BUSOLA_FIS, pentruBusola\(/.test(c), "fișierul pentru Busola");
  assert.ok(/closeTime\) >= de90\)/.test(c) && /new Map\(pbInchisi\.lista\.map\(/.test(c) && /cheia: cheiaBusola/.test(c), "închișii: tăiați la 90 z înainte de JurnalTrade.din, uniți cu lista veche, cheia prin simbolPerp");
  assert.ok(/out\.liniiExtra = /.test(c) && /Busola\.liniaBoti\(/.test(c), "rândul de dimineață");
  assert.ok(/const VERSIUNE_COLECTOR = "v101\.6\d";/.test(c), "versiunea colectorului (v101.60 sau mai nouă)");
  assert.ok(/liniiExtra/.test(citeste("scripts", "lib", "tura-dimineata.mjs")));
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/);
});
await test("(6) garda: rândul Busolei de dimineață (raport) n-are abateri; paza produce chiar text cu „futures ±2×ATR” și pentru LIGHTER (cheia LIT), toate curate", () => {
  const s = situatii().filter((x) => /^busola\.linia/.test(x.sursa)); assert.ok(s.length >= 3, "situații: " + s.length);
  const paza = situatii().filter((x) => /^colector\.busolaMiscare\.mesaj/.test(x.sursa)).map((x) => x.text);
  assert.ok(paza.some((t) => t.includes("futures ±2×ATR")), "nicio situație a pazei cu futures (fixtura fără monedă ⇒ mesaj null ⇒ sărită)");
  assert.ok(situatii().some((x) => /^colector\.busolaMiscare\.titlu/.test(x.sursa) && x.text.startsWith("LIGHTER short 4×")), "LIGHTER (cheia LIT) nu produce mesaj");
  const rele = situatii().filter((x) => /^busola\.linia|^colector\.busola/.test(x.sursa)).map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " ⇐ " + q.x.text).join("\n"));
});

console.log("\n" + (pica ? "V100.90 PICA · " + pica + " din " + (ok + pica) : "V100.90 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
