// Proba v100.104 / colector v101.73 (05.10, el: „FA IDEILE” I-537..I-540):
// (1) I-537 pragul propus din planurile lui scrise (mediana în % din sumă) + „Ia-l din istoria mea”
// (2) I-538 ferestrele oferite pe server (nu doar în browser) + colectorul: „pornit ca LARG” pe Discord
// (3) I-539 a avut dreptate „Ce aș alege eu”? (urmată vs neurmată, același verdict)
// (4) I-540 ceasul ferestrei LARG (2× durata tipică) · (E) versiunile. Depozit PUBLIC ⇒ cifre construite.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridProba = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
const GP = new Function(`${lib("grid-plan.js")}; return GridPlan;`)();
globalThis.GridPlan = GP;
const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)();
const GJ = new Function(`${lib("grid-jurnal.js")}; return GridJurnal;`)();
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.104 · colector v101.73 · I-537..I-540");

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })) }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp) => { const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.3." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env }); return { status: res.status, d: await res.json() }; };

await test("(1) I-537 pragDinPlanuri: mediana pierderii / țintei în % din investiția fiecărui bot + orele; sub 5 planuri ⇒ „puține”, fără cifre", () => {
  const pl = [["a", 2, 6, 12, 40], ["b", 5, 15, 12, 100], ["c", 3, 9, 24, 60], ["d", 2.5, 7.5, 12, 50], ["e", 1, 3, 6, 20], ["x", 9, 9, 12, null]]
    .map(([bot, plus, minus, afaraOre]) => ({ bot, plan: { plus, minus, afaraOre } }));
  const inv = { a: 40, b: 100, c: 60, d: 50, e: 20 };
  assert.deepEqual(TE.pragDinPlanuri(pl, inv), { n: 5, pierdere: 15, tinta: 5, afaraOre: 12, putine: false });
  assert.deepEqual(TE.pragDinPlanuri(pl.slice(0, 3), inv), { n: 3, pierdere: null, tinta: null, afaraOre: null, putine: true });
  assert.deepEqual(TE.pragDinPlanuri([], {}), { n: 0, pierdere: null, tinta: null, afaraOre: null, putine: true });
});
await test("(1) I-537 serverul dă planurile scrise (fără cele de probă), iar poarta are rândul „Din planurile tale” + butonul care completează câmpurile", async () => {
  await env.ISTORIC.put("plan:1", JSON.stringify({ plus: 2, minus: 6, afaraOre: 12 })); await env.ISTORIC.put("plan:2", JSON.stringify({ plus: 1, minus: 3, proba: true }));
  const r = await cheama("GET", "action=planuri"); assert.equal(r.status, 200); assert.deepEqual(r.d.planuri, [{ bot: "1", plan: { plus: 2, minus: 6, afaraOre: 12 } }]);
  const po = fnApp("grPoartaHtml"); assert.match(po, /grPragIstHtml\(\)/);
  assert.match(fnApp("grPragIstHtml"), /data-action-click="grPragDinIstorie\(\)"/); assert.match(fnApp("grPragIstHtml"), /Din planurile tale scrise/);
  assert.match(fnApp("grPragDinIstorie"), /grPragPierdere/); assert.match(fnApp("gridPoarta"), /await grPragIstAdu\(trades\)/);
  assert.match(fnApp("grPragIstAdu"), /TabloExtra\.pragDinPlanuri\(/);
});
const OF = { simbol: "ABC_USDT_PERP", t: 1000, dir: "long", rec: "larg", ta: { jos: 0.97, sus: 1.02, levier: 5, stop: 40, n: 100, oreTipic: 5 }, mea: { jos: 0.89, sus: 1.11, levier: 1, stop: 15, n: 100, oreTipic: 24 } };
const BOT = { id: "9", baza: "ABC.PERP", directie: "long", gridJos: 0.891, gridSus: 1.108, levier: 1, investit: 100, pornitLa: 5000, activ: true };
await test("(2) I-538 GridPlan.fereastraBotului: doar oferte de ÎNAINTE de pornire (≤ 12 h), aceeași monedă și direcție; fără potrivire ⇒ k null cu oferta; fără ofertă ⇒ null", () => {
  const f = GP.fereastraBotului(BOT, [OF]); assert.equal(f.k, "larg"); assert.equal(f.t, 1000); assert.deepEqual([f.stop, f.n, f.oreTipic, f.rec], [15, 100, 24, "larg"]);
  assert.equal(GP.fereastraBotului(Object.assign({}, BOT, { levier: 3 }), [OF]).k, null, "ofertă fără potrivire");
  assert.equal(GP.fereastraBotului(Object.assign({}, BOT, { pornitLa: 500 }), [OF]), null, "pornit înaintea ofertei");
  assert.equal(GP.fereastraBotului(Object.assign({}, BOT, { pornitLa: 1000 + 13 * 3600000 }), [OF]), null, "peste 12 h");
  assert.equal(GP.fereastraBotului(Object.assign({}, BOT, { baza: "XYZ.PERP" }), [OF]), null, "altă monedă");
  const l = GJ.recunoaste([], [BOT], [OF], 9000); assert.equal(l[0].fereastra, "larg"); assert.equal(l[0].recomandat, "larg", "jurnalul ia și recomandarea de atunci (I-539)");
});
await test("(2) I-538 serverul ține ferestrele oferite (curățate, ultimele 60, fără dubluri); pagina le trimite și le citește de acolo", async () => {
  const w = await cheama("POST", "action=ferestre", { oferta: Object.assign({}, OF, { t: 2000, simbol: "<b>X</b>" }) }); assert.equal(w.status, 400, "simbol murdar refuzat");
  for (let i = 0; i < 65; i++) assert.equal((await cheama("POST", "action=ferestre", { oferta: Object.assign({}, OF, { t: 2000 + i }) })).status, 200);
  assert.equal((await cheama("POST", "action=ferestre", { oferta: Object.assign({}, OF, { t: 2064 }) })).status, 200, "dublura nu strică");
  const g = await cheama("GET", "action=ferestre"); assert.equal(g.d.ferestre.length, 60); assert.equal(g.d.ferestre[59].t, 2064); assert.deepEqual(g.d.ferestre[59].mea, OF.mea);
  assert.match(fnApp("grFerestreTine"), /apiFetch\("\/api\/istoric-bot\?action=ferestre"/); assert.match(fnApp("grFerestreCitite"), /grFerestreSrv/);
  assert.match(fnApp("gridJurnalActualizeaza"), /getJSON\("\/api\/istoric-bot\?action=ferestre"\)/);
});
await test("(2) I-538 mesajul de pornire: „pornit ca LARG” cu ora fișei și proba ferestrei; „alt grid decât fișa” fără potrivire; colectorul îl trimite o dată", () => {
  const m = MC.pornitCa("ABC", { k: "larg", t: Date.UTC(2026, 9, 5, 11, 20), stop: 15, n: 100, oreTipic: 24 });
  assert.equal(m.titlu, "ABC: pornit ca LARG din fișă"); assert.equal(m.cheie, "pornit-ca");
  assert.equal(m.mesaj, "Seamănă cu LARG din fișa de la 14:20 (în probă: stopul atins de 15 ori din 100 de porniri).\n👉 Aș lăsa botul să lucreze; dacă stă peste 48 h, te anunț.");
  assert.equal(MC.pornitCa("ABC", { k: "ingust", t: Date.UTC(2026, 9, 5, 11, 20), stop: 40, n: 100, oreTipic: 5 }).mesaj.split("\n")[1], "👉 Aș ține stopul la marginea gridului: îngust iese repede (tipic 5 h).");
  const a = MC.pornitCa("ABC", { k: null, t: Date.UTC(2026, 9, 5, 11, 20) }); assert.equal(a.titlu, "ABC: pornit cu alt grid decât fișa");
  assert.equal(a.mesaj, "Nu seamănă nici cu ÎNGUST, nici cu LARG din fișa de la 14:20.\n👉 Aș verifica poarta: gridul poate să nu încapă în pragul tău de pierdere.");
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /GridPlan\.fereastraBotului\(b, await ferestreServer\(\)\)/); assert.match(col, /MesajeColector\.pornitCa\(/);
  assert.match(col, /if \(!st\._fereastra && acum - Number\(b\.pornitLa\) < 6 \* 3600000\)/);
});
const Z = (fer, rec, moneda, pct, k) => ({ id: fer + rec + moneda + k, t: k, simbol: moneda + "_USDT_PERP", fereastra: fer, recomandat: rec, botId: "b" + fer + rec + moneda + k, activ: false, investit: 100, suma: 100, rezultat: pct * 100 });
const set = (fn) => { const l = []; ["AA", "BB", "CC", "DD", "EE", "FF"].forEach((m, i) => { for (let k = 0; k < 2; k++) { l.push(Z("larg", "larg", m, fn(true, i, k), k)); l.push(Z("ingust", "larg", m, fn(false, i, k), k + 10)); } }); return l; };
await test("(3) I-539 recomandarea: urmată (fereastra = cea recomandată) vs neurmată, aceeași regulă și același verdict; la apăsare se ține ce recomandam", () => {
  const d = GJ.bilantRecomandare(set((u, i, k) => (u ? 0.02 : -0.03) + (i % 3) * 0.002 + k * 0.001)); assert.equal(d.verdict, "dovedit"); assert.equal(d.urmata.n, 12);
  assert.equal(GJ.bilantRecomandare(set((u, i, k) => (u ? -0.03 : 0.02) + (i % 3) * 0.002)).verdict, "pe dos");
  const p = GJ.bilantRecomandare(set(() => 0.01).slice(0, 6)); assert.equal(p.verdict, "puține");
  assert.equal(GJ.textRecomandare(p), "Recomandarea mea pe boții tăi: urmată 3 boți, media +1,0% · neurmată 3 boți, media +1,0% — puține cazuri (trebuie cel puțin 5 pe fiecare, din cel puțin 3 monede).");
  assert.match(GJ.textRecomandare(d), /— urmată a adus mai mult \(dovedit\)\.$/);
  assert.equal(GJ.textRecomandare(GJ.bilantRecomandare([])), null);
  const f = { simbol: "ABC_USDT_PERP", dir: "long", verdict: { nivel: "porneste" }, setare: { suma: 100 } };
  const e = GJ.adauga([], f, 1, { eticheta: "ingust", setare: { jos: 1, sus: 2, grile: 3, levier: 5, suma: 100 }, recomandat: "larg" })[0];
  assert.equal(e.recomandat, "larg"); assert.equal(GJ.adauga([], f, 1)[0].recomandat, null);
  assert.match(fnApp("grFereastraAleasa"), /recomandat:/); assert.match(fnApp("renderGridJurnal"), /GridJurnal\.textRecomandare\(GridJurnal\.bilantRecomandare\(l\)\)/);
});
await test("(4) I-540 ceasul LARG: botul recunoscut ca LARG, pornit de peste 2× durata tipică ⇒ o notă, o dată", () => {
  const m = MC.ceasLarg("ABC", 50, 24);
  assert.equal(m.titlu, "ABC: LARG stă de 50 h (tipic 24 h)"); assert.equal(m.cheie, "ceas-larg"); assert.equal(m.nivel, "info");
  assert.equal(m.mesaj, "Banii stau în grid de peste două ori mai mult decât în probă.\n👉 Aș închide aproape de zero dacă prețul nu mai trece prin grid; dacă lucrează, îl las.");
  assert.match(citeste("scripts", "colector.mjs"), /st\._fereastra && st\._fereastra\.k === "larg" && st\._fereastra\.oreTipic > 0 && !st\._ceasLarg && acum - Number\(b\.pornitLa\) > 2 \* st\._fereastra\.oreTipic \* 3600000/);
});
await test("(E) versiunile v100.104 / colector v101.73", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1(0[4-9]|[1-9]\d)$/); const V2 = bi.version; assert.ok(bi.badge.startsWith(V2 + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V2 + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V2.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V2.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4);
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V2.slice(1) + ".0"); assert.ok(/npm run test:v100103 && npm run test:v100104( && |")/.test(pk));
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(7[3-9]|[89]\d)";/);
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
