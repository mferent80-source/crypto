// Probele v82: semnalele botului (public/lib/semnale-bot.js) - semafor, muta gridul,
// avertizarea BTC, aglomerarea, ia profit, si socoteala semnalelor.
import assert from "node:assert/strict";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/grid-calcul.js") + "\n" + citeste("../public/lib/semnale-bot.js");
const S = new Function(`${SRC}; return typeof SemnaleBot !== "undefined" ? SemnaleBot : null;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const ORA = 3600000, T0 = 1_790_300_000_000;
const bot = (o) => Object.assign({ id: "2382", baza: "MET.PERP", directie: "long", levier: 5, investit: 88.98, profitTotal: -4.7, pretCurent: 0.3403, gridJos: 0.3, gridSus: 0.4, distantaLichidarePct: 22 }, o || {});
const fisa = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "tare", motive: [] }, regim: { r4h: 0.9, r24h: 1.1, miscare: false },
  liniste: { linisteAcum: true, suficient: true, p: 0.5, n: 10, k: 5 }, setare: { jos: 0.317, sus: 0.377, grile: 8, levier: 4, dir: "long", stop: { jos: 0.304, sus: 0.393 } } }, o || {});

console.log("\nV82 · semnalele botului · proba\n");
await test("modulul SemnaleBot exista", () => assert.ok(S, "semnale-bot.js lipseste"));

await test("mutaGridul: pretul in ultimele 10% ale intervalului sau afara >= 2 h -> propunere din fisa (interval, grile, levier, stop); la mijloc -> nu", () => {
  assert.equal(S.mutaGridul(bot(), fisa(), 0), null, "0,34 in 0,30-0,40 = 40%");
  const m = S.mutaGridul(bot({ pretCurent: 0.305 }), fisa(), 0);
  assert.ok(m && m.motiv && /marginea de jos/.test(m.motiv), JSON.stringify(m));
  assert.deepEqual([m.setare.jos, m.setare.sus, m.setare.grile, m.setare.levier], [0.317, 0.377, 8, 4]);
  assert.ok(S.mutaGridul(bot({ pretCurent: 0.41 }), fisa(), 3), "afara de 3 h");
  assert.equal(S.mutaGridul(bot({ pretCurent: 0.41 }), fisa(), 1), null, "afara de 1 h: mai asteptam");
  assert.equal(S.mutaGridul(bot({ pretCurent: 0.305 }), null, 0), null, "fara fisa nu propun cifre inventate");
});

await test("btcAvertizare: BTC in miscare, moneda inca linistita -> atentie; amandoua in miscare sau BTC linistit -> null", () => {
  const a = S.btcAvertizare({ r4h: 2.1, r24h: 1.2, miscare: true }, { r4h: 0.8, r24h: 0.9, miscare: false });
  assert.ok(a); assert.equal(a.nivel, "atentie"); assert.match(a.text, /2,1×/);
  assert.equal(S.btcAvertizare({ r4h: 2.1, r24h: 1, miscare: true }, { miscare: true, r4h: 2, r24h: 1 }), null);
  assert.equal(S.btcAvertizare({ r4h: 1, r24h: 1, miscare: false }, { miscare: false, r4h: 1, r24h: 1 }), null);
  assert.equal(S.btcAvertizare(null, null), null);
});

await test("aglomerare: bot long + funding mare + OI in crestere + multi pe long -> atentie; doar 2 din 3 -> info; pe partea cealalta -> null", () => {
  const oi = (a, b) => [{ sumOpenInterest: String(a), timestamp: T0 - 24 * ORA }, { sumOpenInterest: String(b), timestamp: T0 }];
  const tot = S.aglomerare({ funding: 0.0005, longShort: 1.8, oiHist5m: oi(100, 125) }, "long");
  assert.equal(tot.nivel, "atentie"); aprox(tot.oiSchimb, 0.25, 1e-9);
  assert.equal(S.aglomerare({ funding: 0.0005, longShort: 1.1, oiHist5m: oi(100, 125) }, "long").nivel, "info");
  assert.equal(S.aglomerare({ funding: 0.0005, longShort: 1.8, oiHist5m: oi(100, 125) }, "short"), null, "short-ul incaseaza funding-ul, multimea e pe partea cealalta");
  assert.equal(S.aglomerare({ funding: 0.00005, longShort: 1.5, oiHist5m: oi(100, 101) }, "long"), null, "botul real MET azi: nimic");
  assert.equal(S.aglomerare(null, "long"), null);
});

await test("iaProfit: total >= 2% din investitie si (miscare sau liniste rara) -> semnal cu suma; pe minus sau fara motiv -> null", () => {
  const r = S.iaProfit(bot({ profitTotal: 3 }), fisa({ regim: { r4h: 2, r24h: 1, miscare: true } }));
  assert.ok(r); assert.match(r.text, /\+3\.00 USDT/);
  assert.ok(S.iaProfit(bot({ profitTotal: 3 }), fisa({ liniste: { linisteAcum: true, suficient: true, p: 0.2, n: 10, k: 2 } })));
  assert.equal(S.iaProfit(bot({ profitTotal: 3 }), fisa()), null, "liniste care tine des, fara miscare");
  assert.equal(S.iaProfit(bot({ profitTotal: -4.7 }), fisa({ regim: { r4h: 2, r24h: 1, miscare: true } })), null);
});

await test("semafor: lichidare < 8% -> IESI; planul pe minus -> IESI; o atentie -> ATENTIE cu motivul ei; nimic -> TINE; motivul si 'ce as face' mereu", () => {
  assert.equal(S.semafor({ bot: bot({ distantaLichidarePct: 6 }) }).nivel, "iesi");
  assert.equal(S.semafor({ bot: bot(), plan: { atins: ["minus"], minus: { prag: 10 } } }).nivel, "iesi");
  const a = S.semafor({ bot: bot(), fisa: fisa({ regim: { r4h: 2.3, r24h: 1, miscare: true } }) });
  assert.equal(a.nivel, "atentie"); assert.match(a.motiv, /[Mm]ișcare/);
  const t = S.semafor({ bot: bot(), fisa: fisa() });
  assert.equal(t.nivel, "tine");
  for (const x of [a, t]) assert.ok(x.motiv && x.faCe && x.faCe.length > 15, JSON.stringify(x));
  const m = S.semafor({ bot: bot(), fisa: fisa({ directie: { dir: "short", tarie: "tare", motive: [] } }), btc: { nivel: "atentie", text: "BTC" } });
  assert.equal(m.nivel, "atentie"); assert.ok(m.componente.length >= 2);
});

await test("socoteala: se noteaza o data pe schimbare (nu la fiecare tura); dupa 24 h se judeca pe totalul botului; rezumat pe semnal", () => {
  let log = [];
  log = S.noteaza(log, { nivel: "atentie", cod: "miscare", motiv: "m" }, -4.7, T0);
  log = S.noteaza(log, { nivel: "atentie", cod: "miscare", motiv: "m" }, -4.8, T0 + 5 * 60000);
  assert.equal(log.length, 1, "acelasi semnal repetat nu se noteaza din nou");
  log = S.noteaza(log, { nivel: "tine", cod: "tine", motiv: "ok" }, -4.0, T0 + ORA);
  assert.equal(log.length, 2);
  // la 23 h nimic judecat; la 25 h: 'atentie' avea dreptate daca totalul a scazut; 'tine' daca nu a scazut mult
  assert.ok(S.judeca(log, -6, 88.98, T0 + 23 * ORA).every((x) => x.dreptate == null));
  log = S.judeca(log, -6, 88.98, T0 + 25 * ORA);
  assert.equal(log[0].dreptate, true, "atentie + totalul a scazut -> avea dreptate");
  assert.equal(log[1].dreptate, null, "'tine' notat la T0+1h inca n-are 24h");
  log = S.judeca(log, -3.5, 88.98, T0 + 26 * ORA);
  assert.equal(log[1].dreptate, true, "tine + totalul n-a scazut -> avea dreptate");
  const r = S.socoteala(log);
  assert.equal(r.miscare.judecate, 1); assert.equal(r.miscare.corecte, 1); assert.equal(r.tine.judecate, 1);
  assert.ok(S.noteaza(new Array(250).fill(0).map((_, i) => ({ t: i, cod: "x" + i, nivel: "atentie", total: 0 })), { nivel: "tine", cod: "tine" }, 0, T0).length <= 200, "se tin cel mult 200");
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
