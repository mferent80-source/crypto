// v100.274 (30.10.2026, el: „ok, continua” - ideile rămase după v100.272 / v100.273):
//  1. pagina botului (Monte Carlo pe bot, tbMcPorneste) își ținea lumânările de 15 min separat de fișa Grid și de pagina Monte Carlo ⇒ aceeași
//     monedă se aducea de mai multe ori de la Pionex. Acum folosește memoria comună (grLum15): barele întregi ținute minte intră ca „vechi”
//     (o pagină nouă în loc de 6), iar cele aduse întregi aici rămân celorlalte.
//  2. fișa din Tablou nu spunea când istoricul de 15 min e scurt (fișa Grid și pagina Monte Carlo o spun din v100.272) ⇒ aceeași notă.
//  3. „Regulile tale” (acțiuni): grupa după ora cumpărării se judecă pe ora bursei (corect din v100.272), dar eticheta „după 18” / „16:30”
//     e ora de la noi doar în săptămânile obișnuite; în cele cu decalaj de oră (bursa deschide la 15:30 la noi) pragul e 17 ⇒ textul spune ambele.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
const fnApp = (nume) => {
  let i = APP.indexOf("\nfunction " + nume + "("); if (i < 0) i = APP.indexOf("\nasync function " + nume + "(");
  assert.ok(i >= 0, "lipsește " + nume + " în app.js");
  const j = APP.slice(i + 10).search(/\n(async )?function /); return APP.slice(i + 1, j < 0 ? undefined : i + 10 + j);
};
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); });
}
console.log("\nV100.274 · ideile rămase: memoria comună a lumânărilor, istoricul scurt în Tablou, eticheta grupelor orare\n");

// ═════════ 1. pagina botului pe memoria comună a lumânărilor ═════════
function lumeMemorie() {
  const chem = { tinute: [], tine: [] }, bare = [{ t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 }];
  const box = { String, Array, grBare15Tinute: (k) => { chem.tinute.push(k); return k === "BTC_USDT_PERP" ? bare : null; }, grTine15: (k, b) => { chem.tine.push([k, b.length]); } };
  vm.createContext(box); vm.runInContext(fnApp("tbMcBareTinute") + "\n" + fnApp("tbMcTineBare"), box);
  return { box, chem, bare };
}
await test("1a barele ținute minte de fișa Grid / pagina Monte Carlo (cheia monedă_USDT_PERP) intră ca „vechi” pe pagina botului", () => {
  const { box, chem, bare } = lumeMemorie();
  assert.equal(box.tbMcBareTinute("BTC"), bare); assert.deepEqual(chem.tinute, ["BTC_USDT_PERP"]);
  assert.equal(box.tbMcBareTinute("ETH"), null, "fără bare ținute ⇒ null");
  assert.equal(box.tbMcBareTinute("AAPL.US"), null, "acțiune (cu punct) ⇒ nu întreabă memoria monedelor");
  assert.equal(box.tbMcBareTinute(""), null);
});
await test("1b barele aduse ÎNTREGI pe pagina botului rămân în memoria comună; cele parțiale nu", () => {
  const { box, chem } = lumeMemorie();
  box.tbMcTineBare("BTC", { intreg: true, b15: [1, 2, 3] }); box.tbMcTineBare("BTC", { intreg: false, b15: [1, 2] }); box.tbMcTineBare("BTC", { intreg: true, b15: [] });
  assert.equal(JSON.stringify(chem.tine), JSON.stringify([["BTC_USDT_PERP", 3]]));
});
await test("1c tbMcPorneste: „vechi” = barele lui de pe aceeași monedă, altfel cele din memoria comună; după aducere le lasă în memorie", () => {
  const f = fnApp("tbMcPorneste");
  assert.match(f, /vechi:tbMc\.b15Sim===sim&&tbMc\.b15Intreg\?tbMc\.b15:tbMcBareTinute\(sim\)/, "nu folosește memoria comună");
  assert.match(f, /tbMc\.b15Intreg=c\.intreg[^;]*;tbMcTineBare\(sim,c\)/, "nu lasă barele în memorie");
});

// ═════════ 2. istoricul scurt spus și în fișa din Tablou ═════════
await test("2a tbAduFisaBot ține minte cât istoric de 15 min a avut fișa (d.istoric15)", () => {
  assert.match(fnApp("tbAduFisaBot"), /tbFisa=\{botId:b\.id,la:Date\.now\(\),inLucru:false,fisa:f\.eroare\?null:f,eroare:f\.eroare\|\|null,istoric15:d\.istoric15\|\|null,/);
});
function lumeExtra(istoric15) {
  const el = {}, $ = (id) => (el[id] = el[id] || { id, innerHTML: "", textContent: "", hidden: false });
  const comp = { randuri: [{ et: "Pas", bot: "1%", fisa: "1%" }], semnale: [] };
  const box = { $, escapeHtml: (s) => String(s), TextRo: globalThis.TextRo, GR_NIVEL: {}, Date, Math, Number, String, Array, Object, GridCalcul: { procent: (x) => String(x) },
    TabloExtra: new Proxy({}, { get: (t, k) => k === "comparaCuFisa" ? () => comp : () => null }),
    mcsIstoricScurt: (x, ce) => (!x || !(x.zile < 30) ? "" : "Doar " + Math.floor(x.zile) + " zile de istoric pe 15 minute - " + (x.motiv === "pagina" ? "o pagină n-a venit de la Pionex" : "atât are Pionex pentru moneda asta") + " (de obicei ~31 de zile): " + ce + "."),
    tbFisa: { botId: 7, la: Date.now(), fisa: { verdict: "ok" }, eroare: null, istoric15 } };
  vm.createContext(box);
  /* doar ramura „botul vs fișa” din tbDeseneazaExtra: de la începutul funcției până la sfârșitul ei; ce nu e stubuit aruncă, deci ne oprim la el */
  vm.runInContext(fnApp("tbDeseneazaExtra"), box);
  try { box.tbDeseneazaExtra({ id: 7, investit: 100 }); } catch (e) { /* restul funcției (alte secțiuni) poate cere ce nu e aici */ }
  return el;
}
await test("2b fișa din Tablou spune istoricul scurt (o pagină n-a venit / monedă nouă), ca fișa Grid; cu istoric întreg nimic nou", () => {
  const ids = (el) => Object.values(el).map((x) => x.innerHTML).join("\n");
  const scurt = ids(lumeExtra({ zile: 9.4, motiv: "pagina" }));
  assert.match(scurt, /⚠️ Doar 9 zile de istoric pe 15 minute - o pagină n-a venit de la Pionex \(de obicei ~31 de zile\): fișa e pe atât\. Reîncerc la următoarea reîmprospătare\./, scurt.slice(0, 400));
  const nou = ids(lumeExtra({ zile: 12, motiv: "nou" }));
  assert.match(nou, /atât are Pionex pentru moneda asta \(de obicei ~31 de zile\): fișa e pe atât\.<\/p>/); assert.doesNotMatch(nou, /Reîncerc/);
  const intreg = ids(lumeExtra({ zile: 31, motiv: null })), fara = ids(lumeExtra(null));
  assert.doesNotMatch(intreg, /istoric pe 15 minute/); assert.doesNotMatch(fara, /istoric pe 15 minute/);
  assert.match(intreg, /Setările botului se potrivesc cu fișa de azi/, "tabelul rămâne");
});

// ═════════ 3. eticheta grupelor orare din „Regulile tale” ═════════
await test("3 grupele orare: eticheta spune pragul și în săptămânile cu decalaj de oră (17, 15:30); grupele rămân aceleași (ora bursei)", () => {
  const src = citeste("public", "lib", "actiuni-semnale.js");
  assert.match(src, /"cumpărate între 11 și 16:30 \(15:30 în săptămânile cu decalaj de oră\), înainte de deschidere"/);
  assert.match(src, /"cumpărate după 18 \(17 în săptămânile cu decalaj de oră\)"/);
  assert.match(src, /mNy < DESCHIDERE_NY \? "cumpărate între 11/, "grupele pe ora bursei (minutNy), neschimbate");
  assert.doesNotMatch(src, /: "cumpărate după 18", i\);/, "eticheta veche");
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
process.exit(picate ? 1 : 0);
