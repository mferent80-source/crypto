// Proba v100.48 (01.10, el: „repară tot și adu îmbunătățiri” după auditul GRID-FISA v2.1). Partea din Radar: codul pentru TradingView
// primeste campurile 15-18 pentru GRID-FISA v2.2 (verdictul fisei, momentul generarii, pragurile marginii din profilul monedei),
// fara sa schimbe semnatura (alt grid) si fara sa strice codul vechi (v2.0/v2.1 citesc 9-14 campuri).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.48 · Codul pentru GRID-FISA v2.2 (verdictul fisei, varsta lichidarii, marginea din profil) · proba\n");

const bot = (o) => ({ id: "1", directie: "long", gridJos: 0.3841, gridSus: 0.4331, levier: 5, investit: 49.67, opritorPierdereActiv: true, opritorPierdere: 0.38, lichidareJos: 0.32154, lichidareSus: null, brut: { buOrderData: { row: 35, gridType: "geometric" } }, ...o });

await test("botul: fara „extra” codul ramane ca inainte (14 campuri, formatul v2.0/v2.1)", () => {
  const c = TE.codTVBot(bot(), { minus: 7.5, plus: 2.6, afaraOre: 12 });
  assert.equal(c.cod.split(";").length, 14); assert.equal(c.cod.split(";")[3], "35");
});
await test("botul: cu „extra” - 18 campuri: verdict gol (botul ruleaza), momentul generarii, marginea din profil; semnatura neschimbata", () => {
  const fara = TE.codTVBot(bot(), { minus: 7.5, plus: 2.6, afaraOre: 12 });
  const c = TE.codTVBot(bot(), { minus: 7.5, plus: 2.6, afaraOre: 12 }, { copiatLa: 1790830000000, margJos: 0.0301, margSus: 0.0342 });
  const p = c.cod.split(";");
  assert.equal(p.length, 18, c.cod); assert.equal(p[14], ""); assert.equal(p[15], "1790830000000"); assert.equal(p[16], "0.03010"); assert.equal(p[17], "0.03420");
  assert.equal(c.sig, fara.sig, "alt moment de generare nu e alt grid");
});
await test("botul fara tip si fara plan: pozitiile 11-14 se completeaza (tip gol, plan 0;0;0) ca sa nu alunece campurile 15-18", () => {
  const c = TE.codTVBot(bot({ brut: { buOrderData: { row: 8 } } }), null, { copiatLa: 5, margJos: null, margSus: null });
  const p = c.cod.split(";"); assert.equal(p.length, 18, c.cod);
  assert.equal(p[10], ""); assert.deepEqual(p.slice(11, 14), ["0", "0", "0"]); assert.deepEqual(p.slice(16), ["0", "0"]);
});
await test("pagina: fisa trimite verdictul ei + momentul + marginea; nota langa cod cand fisa nu zice PORNESTE; textele spun GRID-FISA v2.2", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(app, /function grCodTV\(st,info,extra\)/); assert.match(app, /grCodTV\(st,i,\{verdict:/);
  assert.match(app, /TabloExtra\.codTVBot\(b,tbPlan\.botId===b\.id\?tbPlan\.plan:null,\{copiatLa:/);
  assert.match(app, /grTvNotaVerdict/); assert.ok(!/GRID-FISA v2\.0 →/.test(app)); assert.match(app, /GRID-FISA v2\.2/);
  // revizia 01.10: v2.0/v2.1 REFUZA codul de 18 campuri (cer 9-14) - nota nu are voie sa spuna ca „pot zice poți porni”
  assert.ok(!/v2\.0\/v2\.1 nu-l știu și pot zice/.test(app)); assert.match(app, /v2\.0 și v2\.1 refuză codul de 18 câmpuri/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
