// Proba v100.188 / colector v101.109 (13.10.2026, el: „fă idei” — ideile 1 și 2 din v100.187)
// 2) bilanțul cu martor și pentru alertele Busolei: „invers față de bot” (_busolaDir), „toate vocile contra” (_busolaVoci), BTC (_busolaBtc);
//    martorul = o zi în care botul nu e în NICIUN episod (cel mult una la 24 h)
// 1) bilanțul și pe Tablou: colectorul îl trimite cu starea pazei, serverul îl ține, citirea îl arată sub „În pândă”
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import * as P from "./lib/paza-boti.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nv100.188 / colector v101.109 · bilanțul tuturor alertelor de direcție + pe Tablou · proba\n");
const ACUM = Date.UTC(2026, 9, 13, 16, 0, 0), H = 3600000;
const bot = (o = {}) => Object.assign({ id: "b1", baza: "PLUME.PERP", directie: "LONG", levier: 5, profitTotal: -3 }, o);

await test("bilantNoteaza: un episod nou al fiecărei alerte (anuntat schimbat) se notează cu tipul ei", () => {
  const l = [];
  P.bilantNoteaza(l, { bot: bot(), inainte: {}, dupa: { _busolaDir: { semn: "inclinat-short", anuntat: ACUM, anuntatSemn: "inclinat-short" } }, acum: ACUM });
  P.bilantNoteaza(l, { bot: bot(), inainte: {}, dupa: { _busolaVoci: { contra: true, anuntat: ACUM, anuntatContra: true }, _busolaBtc: { contra: true, anuntat: ACUM, anuntatContra: true } }, acum: ACUM });
  P.bilantNoteaza(l, { bot: bot(), inainte: { _panda: { contra: true, anuntat: 5 } }, dupa: { _panda: { contra: true, anuntat: ACUM } }, acum: ACUM });
  assert.deepEqual(l.map((x) => x.tip), ["dir", "voci", "btc", "contra"]);
  P.bilantNoteaza(l, { bot: bot(), inainte: { _busolaDir: { anuntat: ACUM } }, dupa: { _busolaDir: { semn: "inclinat-short", anuntat: ACUM, anuntatSemn: "inclinat-short" } }, acum: ACUM + H });
  assert.equal(l.length, 4, "același episod nu se notează a doua oară");
});
await test("bilantNoteaza: martorul doar când botul nu e în niciun episod (pânda, voci, direcția anunțată, BTC), cel mult o dată la 24 h", () => {
  const l = [];
  for (const dupa of [{ _panda: { contra: true } }, { _busolaVoci: { contra: true } }, { _busolaDir: { semn: "inclinat-short", anuntatSemn: "inclinat-short" } }, { _busolaBtc: { contra: true } }])
    P.bilantNoteaza(l, { bot: bot(), inainte: dupa, dupa, acum: ACUM });
  assert.equal(l.length, 0, "în episod: fără martor");
  P.bilantNoteaza(l, { bot: bot(), inainte: {}, dupa: { _panda: { contra: false }, _busolaDir: { semn: "inclinat-long", anuntatSemn: "inclinat-short" } }, acum: ACUM });
  P.bilantNoteaza(l, { bot: bot(), inainte: {}, dupa: {}, acum: ACUM + 2 * H });
  assert.deepEqual(l.map((x) => x.tip), ["martor"]);
});
await test("pandaNoteaza (v100.187) rămâne la fel: episodul pânda și martorul", () => {
  const l = [];
  P.pandaNoteaza(l, { bot: bot(), inainte: undefined, dupa: { contra: true, anuntat: ACUM }, acum: ACUM });
  P.pandaNoteaza(l, { bot: bot({ id: "b2" }), inainte: undefined, dupa: { contra: false }, acum: ACUM });
  assert.deepEqual(l.map((x) => x.tip), ["contra", "martor"]);
});
await test("bilantAlerte: rândul pândei mereu; Busola / voci / BTC doar când au episoade judecate; același martor", () => {
  const ep = (tip, d, n) => Array.from({ length: n }, () => ({ tip, delta: d }));
  assert.deepEqual(P.bilantAlerte([]), ["Alerta „contra” din pândă (bilanț la 72 h): încă nimic judecat."]);
  const r = P.bilantAlerte(ep("dir", -1, 2).concat(ep("voci", 1, 1), ep("martor", 1, 3), [{ tip: "btc" }]));
  assert.equal(r.length, 3);
  assert.match(r[0], /^Alerta „contra” din pândă \(bilanț la 72 h\): 0 episoade, botul a pierdut în 0 \(0%\) · martorul/);
  assert.match(r[1], /^Busola „invers față de bot” \(bilanț la 72 h\): 2 episoade, botul a pierdut în 2 \(100%\) · martorul \(zile fără contra\): 3, pierdut în 0 \(0%\) · prea puține/);
  assert.match(r[2], /^„Toate vocile contra” \(bilanț la 72 h\): 1 episod, botul a pierdut în 0 \(0%\)/);
  assert.equal(P.pandaBilant(ep("martor", 1, 2)), r[0].replace(/0 episoade.*$/, "") + "0 episoade, botul a pierdut în 0 (0%) · martorul (zile fără contra): 2, pierdut în 0 (0%) · prea puține ca să spună ceva (trebuie cel puțin 10 de fiecare).");
});
await test("pentruServer: + bilanțul când colectorul are lista; fără ea, ieșirea de până acum", () => {
  const st = { b1: { _busola: { stare: "liniste", la: 1, de: 1 } }, _colector: { pandaContra: [{ tip: "martor", delta: 1 }] } };
  const o = P.pentruServer([bot()], st, ACUM);
  assert.deepEqual(o.bilant, P.bilantAlerte(st._colector.pandaContra));
  assert.deepEqual(P.pentruServer([bot()], { b1: st.b1 }, ACUM), { la: ACUM, boti: { b1: { stare: "liniste", la: 1, de: 1 } } });
});
await test("serverul (ruta paza): ține bilanțul (cel mult 6 rânduri, 400 de semne), GET îl dă; fără el, null", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const Hd = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.188.0.1" };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=paza", { method: "POST", headers: Hd, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=paza", { headers: Hd }), env: ENV })).text());
  await post({ la: ACUM, boti: {}, bilant: ["a: b", "x".repeat(900), 3, "c", "d", "e", "f", "g"] });
  const g = await get();
  assert.equal(g.paza.bilant.length, 6); assert.equal(g.paza.bilant[1].length, 400); assert.equal(g.paza.bilant[2], "3");
  await post({ la: ACUM, boti: {} });
  assert.equal((await get()).paza.bilant, null);
});
await test("Tabloul: citirea pune rândurile bilanțului după „În pândă” (ce = partea dinaintea „: ”)", () => {
  const app = citeste("public", "app.js");
  assert.match(app, /tbPazaKv\.bilant=d&&d\.paza&&Array\.isArray\(d\.paza\.bilant\)\?d\.paza\.bilant:null;/);
  assert.match(app, /out\.bilant=\(tbPazaKv\.bilant\|\|\[\]\)\.map\(function\(l\)\{var i=String\(l\)\.indexOf\(": "\);return i>0\?\{ce:String\(l\)\.slice\(0,i\),stare:"info",text:String\(l\)\.slice\(i\+2\)\}:null\}\)\.filter\(Boolean\);/);
  assert.match(app, /if\(ex\.latimeMoneda\)out\.push\(rd\(ex\.latimeMoneda\)\);if\(ex\.bilant\)ex\.bilant\.forEach\(function\(x\)\{out\.push\(rd\(x\)\)\}\);/);
});
await test("colectorul: starea de dinainte pe toate cele 4 alerte, bilantNoteaza după paza fiecărui bot, raportul cu bilantAlerte; v101.109", () => {
  const COL = citeste("scripts", "colector.mjs");
  assert.match(COL, /const VERSIUNE_COLECTOR = "v101\.109";/);
  assert.match(COL, /const bilantInainte = \{\}; for \(const k of \["_panda", "_busolaDir", "_busolaVoci", "_busolaBtc"\]\) bilantInainte\[k\] = stareAlerte\[b\.id\] && stareAlerte\[b\.id\]\[k\];/);
  assert.match(COL, /bilantNoteaza\(meta\(\)\.pandaContra \|\| \(meta\(\)\.pandaContra = \[\]\), \{ bot: b, inainte: bilantInainte, dupa: stareAlerte\[b\.id\] \|\| \{\}, acum \}\)/);
  assert.match(COL, /rap\.linii\.push\(\.\.\.bilantAlerte\(m\.pandaContra \|\| \[\]\)\);/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
