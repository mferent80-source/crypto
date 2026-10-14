// Proba v100.189 / colector v101.110 (13.10.2026, el: „fă idei” — ideile 1 și 2 din v100.188)
// 2) bilanțul judecă fiecare episod (și martorul) și la 24 h, nu doar la 72 h; verdictul rămâne pe 72 h
// 1) lista episoadelor pe pagina Alerts (cele mai noi 30, fără martori): botul, alerta, când, rezultatul la 24 h și la 72 h, cu O zecimală
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import * as P from "./lib/paza-boti.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nv100.189 / colector v101.110 · bilanțul și la 24 h + lista episoadelor pe Alerts · proba\n");
const ACUM = Date.UTC(2026, 9, 13, 16, 0, 0), H = 3600000;

await test("pandaJudeca: delta24 la 24 h (o dată), delta la 72 h, fiecare pe profitul ultim văzut atunci", () => {
  const l = [{ tip: "dir", id: "b1", nume: "PLUME", la: ACUM, p0: -3, ultim: -3 }];
  P.pandaJudeca(l, [{ id: "b1", profitTotal: -4 }], ACUM + 23 * H); assert.equal(l[0].delta24, undefined);
  P.pandaJudeca(l, [{ id: "b1", profitTotal: -5 }], ACUM + 24 * H); assert.equal(l[0].delta24, -2);
  P.pandaJudeca(l, [{ id: "b1", profitTotal: 9 }], ACUM + 30 * H); assert.equal(l[0].delta24, -2, "judecat o singură dată");
  P.pandaJudeca(l, [{ id: "b1", profitTotal: -1 }], ACUM + 72 * H); assert.equal(l[0].delta, 2);
});
await test("bilanțul: partea „la 24 h” când există; fără ea textul de până acum; doar 24 h ⇒ „la 72 h încă nimic judecat”", () => {
  const ep = (tip, d, d24, n) => Array.from({ length: n }, () => ({ tip, delta: d, delta24: d24 }));
  assert.match(P.pandaBilant(ep("contra", -1, -1, 2).concat(ep("martor", 1, -1, 4))), /^Alerta „contra” din pândă \(bilanț la 72 h\): 2 episoade, botul a pierdut în 2 \(100%\) · martorul \(zile fără contra\): 4, pierdut în 0 \(0%\) · la 24 h: pierdut în 2 din 2 \(100%\), martorul în 4 din 4 \(100%\) · prea puține/);
  assert.equal(P.pandaBilant([{ tip: "contra", delta24: -1 }, { tip: "martor", delta24: 2 }]), "Alerta „contra” din pândă (bilanț la 72 h): la 72 h încă nimic judecat · la 24 h: pierdut în 1 din 1 (100%), martorul în 0 din 1 (0%).");
  assert.equal(P.pandaBilant([]), "Alerta „contra” din pândă (bilanț la 72 h): încă nimic judecat.");
  assert.doesNotMatch(P.pandaBilant(ep("contra", -1, undefined, 2)), /la 24 h:/);
});
await test("bilantAlerte: un tip apare și când are doar episoade judecate la 24 h", () => {
  const r = P.bilantAlerte([{ tip: "voci", delta24: -1 }]);
  assert.equal(r.length, 2); assert.match(r[1], /^„Toate vocile contra” \(bilanț la 72 h\): la 72 h încă nimic judecat · la 24 h: pierdut în 1 din 1/);
});
await test("pentruServer: + episoadele (cele mai noi 30, fără martori, cel mai nou primul) și numărul martorilor", () => {
  const l = [{ tip: "martor", id: "b1", nume: "PLUME", la: 1 }].concat(Array.from({ length: 35 }, (_, i) => ({ tip: "dir", id: "b1", nume: "PLUME", la: 100 + i, p0: 0, ultim: 0, delta24: i === 34 ? -2.04 : undefined, delta: undefined })));
  const o = P.pentruServer([], { _colector: { pandaContra: l } }, ACUM);
  assert.equal(o.episoade.length, 30); assert.equal(o.martori, 1);
  assert.deepEqual(o.episoade[0], { tip: "dir", nume: "PLUME", la: 134, d24: -2.04, d72: null });
  assert.equal(o.episoade[29].la, 105);
});
await test("serverul (ruta paza): ține episoadele (≤ 30, tipuri știute, nume ≤ 20) și martorii; GET le dă", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const Hd = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.189.0.1" };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=paza", { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=paza", { headers: Hd }), env: ENV })).text());
  const ep = Array.from({ length: 40 }, (_, i) => ({ tip: i === 1 ? "<script>" : "dir", nume: "X".repeat(50), la: 1000 + i, d24: -1, d72: "z" }));
  await post({ la: ACUM, boti: {}, episoade: ep, martori: 7 });
  const g = (await get()).paza;
  assert.equal(g.episoade.length, 29, "30 luate, cel cu tip necunoscut scos"); assert.equal(g.episoade[0].nume.length, 20); assert.equal(g.episoade[0].d72, null); assert.equal(g.martori, 7);
  await post({ la: ACUM, boti: {} }); const g2 = (await get()).paza; assert.equal(g2.episoade, null); assert.equal(g2.martori, null);
});
await test("pagina Alerts: blocul #alEpisoade sub centrul de alerte; desenat la intrarea pe pagină", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js");
  assert.match(html, /<div class="alCentru" id="alCentru">[\s\S]*?<\/div>\n<div class="tbBloc alEpisoade" id="alEpisoade" hidden><\/div>/);
  assert.match(app, /if\(id==="alerts"\)\{renderAlerts\(\);if\(typeof alCentruPorneste==="function"\)alCentruPorneste\(true\);if\(typeof alEpisoadeDeseneaza==="function"\)alEpisoadeDeseneaza\(\)\}/);
});
await test("alEpisoadeHtml: rândurile cu o zecimală, culoarea pe 72 h (altfel 24 h), „în curs”; gol ⇒ textul de așteptare; escapat", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("function alEpisoadeHtml("), j = app.indexOf("\n", i);
  assert.ok(i > 0, "alEpisoadeHtml lipsește");
  const c = { escapeHtml: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), Date, String, Math, Number, isFinite, TextRo: globalThis.TextRo };
  vm.createContext(c); vm.runInContext(app.slice(i, j), c);
  const la = new Date(2026, 9, 13, 18, 32).getTime();
  const h = c.alEpisoadeHtml({ episoade: [{ tip: "dir", nume: "PLUME", la, d24: -2.04, d72: null }, { tip: "contra", nume: "A<b", la, d24: 1.26, d72: 3 }], martori: 4 });
  assert.match(h, /<h4>Episoadele alertelor de direcție<\/h4>/);
  assert.match(h, /<span>PLUME · Busola „invers față de bot” <span class="tbSub">13\.10 18:32<\/span><\/span><b class="bad">24 h −2,0 · 72 h în curs<\/b>/);
  assert.match(h, /<span>A&lt;b · pânda „contra” <span class="tbSub">13\.10 18:32<\/span><\/span><b class="good">24 h \+1,3 · 72 h \+3,0<\/b>/);
  assert.match(h, /4 zile-martor notate/);
  assert.match(c.alEpisoadeHtml({ episoade: [], martori: 0 }), /Niciun episod încă/);
  assert.equal(c.alEpisoadeHtml(null), "");
});
await test("colectorul de la v101.110 în sus", () => { const m = /const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("scripts", "colector.mjs")); assert.ok(m && Number(m[1]) >= 110, "v101.110+"); });   // v100.190: convenția „de la vX în sus”

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
