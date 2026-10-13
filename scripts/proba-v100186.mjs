// Proba v100.186 / colector v101.107 (13.10.2026, el: „fă idei” — ideile 1 și 2 din v100.185)
// 1) paza boților: alertă când moneda botului, în pândă (150 perp-uri, direcția pe 84 de zile), e pe partea CEALALTĂ a botului —
//    o dată pe episod, cel mult una pe bot la 24 h; lățimea veche / lipsă / bot neutru ⇒ nu atinge starea; tace cât vocile sunt anunțate
// 2) Acasă: semnul pândei pe cartela fiecărui bot (prag atins / CONTRA)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import * as P from "./lib/paza-boti.mjs";
import * as MC from "./lib/mesaje-colector.mjs";
import { turaLatime } from "./lib/tura-latime.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nv100.186 / colector v101.107 · alerta „contra” din pândă + semnul pe Acasă · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "latime.js"), ctx);
const L = ctx.Latime, ACUM = Date.UTC(2026, 9, 13, 14, 0, 0), H = 3600000;
const lat = (o = {}) => ({ acum: Object.assign({ la: ACUM - 5 * 60000, n: 2, lat: {}, regim: { cod: "LARG-SUS" }, eroare: null, monede: [
  { sym: "PLUMEUSDT", dir: "SUS", zileDir: 51, volPctl: 98, extPctl: 40, adrUsed: 50, fundPctl: 50, oiPctl: 10 },
  { sym: "LITUSDT", dir: "JOS", zileDir: 3, volPctl: 20, extPctl: 10, adrUsed: 30, fundPctl: 50, oiPctl: 10 }] }, o) });
const bot = (o = {}) => Object.assign({ id: "b1", baza: "PLUME.PERP", simbolPionex: "PLUME_USDT_PERP", directie: "SHORT", levier: 5 }, o);

await test("pazaPanda: botul CONTRA monedei ⇒ mesaj o dată; aceeași stare ⇒ tace; după 24 h tot tace cât ține episodul", () => {
  const a = P.pazaPanda({ Latime: L, latime: lat(), bot: bot(), inainte: undefined, acum: ACUM });
  assert.equal(a.tine, true); assert.ok(a.mesaj, "primul contra anunțat");
  assert.equal(a.mesaj.cheie, "panda-contra"); assert.equal(a.mesaj.nivel, "atentie");
  assert.match(a.mesaj.titlu, /^PLUME short 5× · pânda: moneda SUS de 51 de zile, botul tău e CONTRA$/);
  assert.match(a.mesaj.mesaj, /84 de zile/); assert.match(a.mesaj.mesaj, /nu e un semnal de închidere/);
  const b = P.pazaPanda({ Latime: L, latime: lat(), bot: bot(), inainte: a.stare, acum: ACUM + 15 * 60000 });
  assert.equal(b.mesaj, null); assert.equal(b.stare.anuntat, a.stare.anuntat);
  assert.equal(P.pazaPanda({ Latime: L, latime: lat({ la: ACUM + 30 * H }), bot: bot(), inainte: b.stare, acum: ACUM + 30 * H }).mesaj, null);
});
await test("pazaPanda: iese din contra ⇒ starea se schimbă fără mesaj; reintră după 24 h ⇒ mesaj; reintră sub 24 h ⇒ tace (frână la oscilație)", () => {
  const a = P.pazaPanda({ Latime: L, latime: lat(), bot: bot(), inainte: undefined, acum: ACUM });
  const iese = P.pazaPanda({ Latime: L, latime: lat({ la: ACUM + H }), bot: bot({ directie: "LONG" }), inainte: a.stare, acum: ACUM + H });
  assert.equal(iese.mesaj, null); assert.equal(iese.stare.contra, false);
  assert.equal(P.pazaPanda({ Latime: L, latime: lat({ la: ACUM + 2 * H }), bot: bot(), inainte: iese.stare, acum: ACUM + 2 * H }).mesaj, null, "sub 24 h");
  assert.ok(P.pazaPanda({ Latime: L, latime: lat({ la: ACUM + 25 * H }), bot: bot(), inainte: iese.stare, acum: ACUM + 25 * H }).mesaj, "după 24 h");
});
await test("pazaPanda: cu direcția monedei ⇒ fără mesaj; tickerul Pionex (LIT_USDT_PERP, baza LIGHTER.PERP) găsește LITUSDT", () => {
  assert.equal(P.pazaPanda({ Latime: L, latime: lat(), bot: bot({ directie: "LONG" }), inainte: undefined, acum: ACUM }).mesaj, null);
  const l = P.pazaPanda({ Latime: L, latime: lat(), bot: bot({ baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", directie: "LONG" }), inainte: undefined, acum: ACUM });
  assert.match(l.mesaj.titlu, /^LIGHTER long 5× · pânda: moneda JOS de 3 zile, botul tău e CONTRA$/);
});
await test("pazaPanda: lățime lipsă / veche (> 45 min) / cu eroare, monedă din afara celor 150, bot neutru ⇒ nu atinge starea", () => {
  for (const [latime, b] of [[null, bot()], [lat({ la: ACUM - 60 * 60000 }), bot()], [lat({ eroare: "Binance mut" }), bot()], [lat(), bot({ baza: "XYZ.PERP", simbolPionex: "XYZ_USDT_PERP" })], [lat(), bot({ directie: "neutru" })]])
    assert.deepEqual(P.pazaPanda({ Latime: L, latime, bot: b, inainte: { contra: true }, acum: ACUM }), { tine: false, mesaj: null });
});
await test("pazaPas: alerta pânda pleacă prin trimite și se scrie în _panda; netrimisă ⇒ starea rămâne", async () => {
  const B = { pazaStare: () => null, randDirectie: () => null };
  const st = {}, plecate = [];
  await P.pazaPas({ Busola: B, rez: null, bot: bot(), st, acum: ACUM, trimite: async (m) => { plecate.push(m); return true; }, Latime: L, latime: lat() });
  assert.equal(plecate.length, 1); assert.equal(plecate[0].cheie, "panda-contra"); assert.equal(st._panda.contra, true);
  const st2 = {};
  await P.pazaPas({ Busola: B, rez: null, bot: bot(), st: st2, acum: ACUM, trimite: async () => false, Latime: L, latime: lat() });
  assert.equal(st2._panda, undefined);
});
await test("pazaPas: cât vocile sunt anunțate contra, pânda doar se marchează (fără al doilea mesaj)", async () => {
  const B = { pazaStare: () => null, randDirectie: () => null };
  const st = { _busolaVoci: { contra: true, anuntatContra: true } }, plecate = [];
  await P.pazaPas({ Busola: B, rez: null, bot: bot(), st, acum: ACUM, trimite: async (m) => { plecate.push(m); return true; }, Latime: L, latime: lat() });
  assert.equal(plecate.length, 0); assert.equal(st._panda.contra, true); assert.ok(st._panda.anuntat > 0);
});
await test("tura lățimii dă corpul măsurat colectorului (d.dupa), și pe eroare", async () => {
  let primit = null;
  const d = { Latime: L, binance: async () => null, trimite: async () => ({ ok: true }), jurnal() {}, pauza: async () => {}, botiSimboluri: () => [], dupa: (c) => { primit = c; } };
  await turaLatime(d, {}, ACUM);
  assert.ok(primit && primit.la === ACUM && primit.eroare, "pe eroare (Binance mut) colectorul primește corpul cu eroarea");
});
await test("colectorul: ține ultima lățime și o dă pazei; versiunea v101.107", () => {
  const COL = citeste("scripts", "colector.mjs");
  assert.match(COL, /const VERSIUNE_COLECTOR = "v101\.1(0[7-9]|[1-9]\d)";/, "v101.107 sau mai nou");
  assert.match(COL, /var latimeUltima = null;/, "var, nu let (TDZ la pornire)");
  assert.match(COL, /dupa: \(c\) => \{ latimeUltima = \{ acum: c \}; \}/);
  assert.match(COL, /await pazaPas\(\{ Busola, rez: Busola\.rezumat\(\), bot: b, st: stareAlerte\[b\.id\], acum, pret: Alerte\.pret, trimite: \(m\) => trimiteAlerta\(m, b\.id, m\.cheie\), Latime, latime: latimeUltima,/);
});

await test("Acasă (acPandaLin): CONTRA ⇒ roșu; prag atins ⇒ galben; nimic ⇒ gri; fără date sau monedă necunoscută ⇒ fără rând", () => {
  const ACAS = citeste("public", "lib", "acasa-ecran.js"), i = ACAS.indexOf("function acPandaLin(b) {"), j = ACAS.indexOf("\n}\n", i);
  assert.ok(i > 0, "acPandaLin lipsește"); assert.match(ACAS, /\+ acPandaLin\(b\);\n  \}\);/, "chemată pe fiecare bot, după „Mediul lui”");
  const c = { Latime: L, tbLatimeKv: { d: lat({ la: Date.now() - 60000 }) }, escapeHtml: (s) => String(s).replace(/</g, "&lt;"), Date, String };
  vm.createContext(c); vm.runInContext(ACAS.slice(i, j + 2), c);
  assert.equal(c.acPandaLin(bot()), '<div class="acLin"><span>În pândă</span><b class="bad">CONTRA botului · SUS de 51 de zile · volatilitate extremă</b></div>');
  assert.equal(c.acPandaLin(bot({ directie: "LONG" })), '<div class="acLin"><span>În pândă</span><b class="tbWarn">SUS de 51 de zile · volatilitate extremă</b></div>');
  assert.equal(c.acPandaLin(bot({ baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", directie: "SHORT" })), '<div class="acLin"><span>În pândă</span><b class="acMut">JOS de 3 zile</b></div>');
  assert.equal(c.acPandaLin(bot({ baza: "XYZ.PERP", simbolPionex: "XYZ_USDT_PERP" })), "");
  c.tbLatimeKv.d = null; assert.equal(c.acPandaLin(bot()), "");
});
await test("sosirea lățimii redesenează și Acasă, când e pe ecran", () => {
  assert.match(citeste("public", "app.js"), /tbDeseneazaCitire\(tbStare\.citireO,tbStare\.bot\);var ac=\$\("dash"\);if\(ac&&ac\.classList\.contains\("on"\)&&typeof acasaDeseneaza==="function"\)acasaDeseneaza\(\)\}\)\}/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
