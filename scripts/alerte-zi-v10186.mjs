// Proba jurnalului alertelor de azi (v101.86, pagina alerts în două). Fără rețea. Rulare: node scripts/alerte-zi-v10186.mjs
import assert from "node:assert/strict";
import { ziRo, adaugaInJurnal, eZgomot, alertePentruPoza, ALERTE_ZI_MAX } from "./lib/alerte-zi.mjs";
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const T = Date.UTC(2026, 9, 7, 11, 0);   // 14:00 ora României

await test("ziRo: ora României, nu UTC (22:30 UTC = ziua următoare la noi)", () => {
  assert.equal(ziRo(Date.UTC(2026, 9, 7, 21, 30)), "2026-10-08");
  assert.equal(ziRo(T), "2026-10-07");
});
await test("adaugaInJurnal: ziua nouă golește lista; plafonul 400 păstrează cele mai noi", () => {
  let j = adaugaInJurnal(null, { t: T, nivel: "info", titlu: "MU: −1% azi", mesaj: "x", cheie: "t212-pas-MU" }, T);
  assert.equal(j.zi, "2026-10-07"); assert.equal(j.lista.length, 1);
  j = adaugaInJurnal(j, { t: T + 86400000, nivel: "info", titlu: "a doua zi" }, T + 86400000);
  assert.equal(j.lista.length, 1); assert.equal(j.lista[0].titlu, "a doua zi");
  for (let i = 0; i < ALERTE_ZI_MAX + 5; i++) j = adaugaInJurnal(j, { t: T + 86400000 + i, nivel: "info", titlu: "n" + i }, T + 86400000 + i);
  assert.equal(j.lista.length, ALERTE_ZI_MAX); assert.equal(j.lista[j.lista.length - 1].titlu, "n" + (ALERTE_ZI_MAX + 4));
});
await test("eZgomot: grila și perechile încheiate da; rezumatul pe oră nu", () => {
  assert.equal(eZgomot({ cheie: "grila", titlu: "PONS: grilă atinsă — a vândut la ~0.40970" }), true);
  assert.equal(eZgomot({ titlu: "✅ PONS: pereche încheiată +0,02 USDT" }), true);
  assert.equal(eZgomot({ titlu: "✅ PONS: 2 perechi încheiate +0,04 USDT" }), true);
  assert.equal(eZgomot({ cheie: "perechi-ora", titlu: "✅ PONS: 8 perechi în ultima oră, +0,17 USDT din grile" }), false);
});
await test("alertePentruPoza: grupele det/urm, deținutele urmărite trec la det, Salt scurt, piața fără simbol, zgomotul fără mesaj", () => {
  const l = [
    { t: T + 1, nivel: "info", titlu: "MU: −1% azi", mesaj: "m", cheie: "t212-pas-MU-m1" },
    { t: T + 2, nivel: "atentie", titlu: "WKL.AS: +2,8% azi, de 2,1× mișcarea lui obișnuită", mesaj: "m", cheie: "sim-miscare-WKL.AS-2026-10-07" },
    { t: T + 3, nivel: "atentie", titlu: "MU: +3,1% azi, de 2,0× mișcarea lui obișnuită", mesaj: "m", cheie: "sim-miscare-MU-2026-10-07" },
    { t: T + 4, nivel: "critic", titlu: "Salt · RHM: sub stopul care urcă (1.109,08 EUR)", mesaj: "m", cheie: "salt-stop-DE0007030009" },
    { t: T + 5, nivel: "info", titlu: "PONS (short 3×): −1,2% în 32 min", mesaj: "m", bot: "2411", cheie: "bot-pas-2411" },
    { t: T + 6, nivel: "info", titlu: "PONS: grilă atinsă — a vândut la ~0.40970", mesaj: "lung", bot: "2411", cheie: "grila" },
    { t: T + 7, nivel: "critic", titlu: "Crypto: mișcare", mesaj: "m", cheie: "vreme-crypto" }];
  const p = alertePentruPoza({ zi: "2026-10-07", lista: l }, { detinute: ["MU", "RHM.DE", "PONS"], urmarite: ["WKL.AS", "MU"], boti: [{ id: "2411", s: "PONS" }] }, T + 10);
  assert.deepEqual(p.map((a) => a.t - T), [7, 6, 5, 4, 3, 2, 1], "cele mai noi primele");
  const g = (s) => p.find((a) => a.titlu.startsWith(s));
  assert.equal(g("WKL.AS").grup, "urm"); assert.equal(g("WKL.AS").src, "urm"); assert.equal(g("WKL.AS").sim, "WKL.AS");
  assert.equal(g("MU: +3").grup, "det", "MU e urmărit DAR deținut ⇒ o singură dată, la Ce dețin");
  assert.equal(g("Salt ·").grup, "det"); assert.equal(g("Salt ·").src, "salt"); assert.equal(g("Salt ·").sim, "RHM.DE");
  assert.equal(g("PONS (").src, "bot"); assert.equal(g("PONS (").sim, "PONS");
  assert.equal(g("PONS: grilă").zgomot, true); assert.equal(g("PONS: grilă").mesaj, "", "zgomotul fără mesaj (poza mică)");
  assert.equal(g("Crypto").src, "piata"); assert.equal(g("Crypto").sim, ""); assert.equal(g("Crypto").grup, "det");
  assert.equal(g("MU: −1").src, "t212");
});
await test("alertePentruPoza: jurnalul de ieri = listă goală (nu alertele de ieri ca «de azi»)", () => {
  assert.deepEqual(alertePentruPoza({ zi: "2026-10-06", lista: [{ t: T - 86400000, nivel: "info", titlu: "MU: −1% azi" }] }, { detinute: ["MU"], urmarite: [], boti: [] }, T), []);
});
// ---- Task 2: rândurile Salt + câmpurile noi în poză ----
const { construiestePoza } = await import("./lib/poza.mjs");
const { turaSaltPozitii } = await import("./lib/tura-salt-pozitii.mjs");
await test("construiestePoza: alerte / salt / saltCereri trec în poză; lipsa lor = câmpul lipsește (colector vechi ≠ gol)", () => {
  const p = construiestePoza({ acum: T, alerte: [{ t: T, titlu: "x", grup: "det" }], salt: { la: T, randuri: [{ isin: "DE0007030009", simbol: "RHM.DE" }] }, saltCereri: [{ id: "a1", stare: "ok" }] });
  assert.equal(p.alerte.length, 1); assert.equal(p.salt.randuri[0].simbol, "RHM.DE"); assert.equal(p.saltCereri[0].stare, "ok");
  const v = construiestePoza({ acum: T });
  assert.equal("alerte" in v, false); assert.equal("salt" in v, false); assert.equal("saltCereri" in v, false);
});
await test("turaSaltPozitii: un rând pe poziție, cu SL/TP din analiză, EUR, plata; fără bare ⇒ rând cu pret null", async () => {
  const bare = Array.from({ length: 130 }, (_, i) => ({ t: T - (130 - i) * 86400000, o: 100, h: 101, l: 99, c: 100 - i * 0.1 }));
  const Salt = { perecheFx: () => null, medieInMonedaSimbolului: (p) => p.pretMediu,
    analizeaza: (p, b) => ({ p: { pret: b[b.length - 1].c, maxDupaCumparare: 101 }, niv: { stopPozitie: 85.85, tintaPozitie: 120 }, cons: { nivel: "iesi", titlu: "Sub stop", faCe: "Ies", motive: ["sub stop"] } }) };
  const r = await turaSaltPozitii({ pozitii: [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall", qty: 2, pretMediu: 120, de: "2026-05-11", plata: "EUR" }, { isin: "US64110L1061", simbol: "NFLX", qty: 1, pretMediu: 80, plata: "EUR" }],
    univers: [{ isin: "DE0007030009", moneda: "EUR" }, { isin: "US64110L1061", moneda: "USD" }], cereBare: async (s) => (s === "RHM.DE" ? bare : []), Salt, deps: {}, stare: {}, trimite: async () => true, acum: T });
  assert.equal(r.randuri.length, 2);
  const a = r.randuri[0];
  assert.equal(a.simbol, "RHM.DE"); assert.equal(a.moneda, "EUR"); assert.equal(a.niv, "iesi"); assert.deepEqual(a.sugestie, { stop: 85.85, tinta: 120 }); assert.equal(a.max, 101);
  assert.equal(a.prev, bare[bare.length - 2].c); assert.equal(a.closes30.length, 30); assert.equal(Math.round(a.rez * 10) / 10, Math.round((a.val - a.cost) * 10) / 10);
  assert.equal(a.motive[0], "sub stop"); assert.equal(a.sfat, "Ies");
  assert.equal(r.randuri[1].pret, null); assert.equal(r.randuri[1].motivFara, "bare");
});
// ---- Task 3: cererile Salt de pe pagina alerts ----
const { aplicaCereriSalt } = await import("./lib/salt-cereri.mjs").catch(() => ({ aplicaCereriSalt: null }));
const UNIV = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", moneda: "EUR" }, { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc.", moneda: "USD" }];
await test("aplicaCereriSalt: pune după simbol (litere mici), EUR ⇒ plata EUR, USD la acțiune în USD ⇒ plata simbol, înlocuiește după ISIN, scoate", () => {
  let r = aplicaCereriSalt([], [{ id: "1", op: "pune", simbol: "nflx", qty: 14.43412, pretMediu: 79.84, moneda: "EUR", de: "2026-04-21" }], UNIV);
  assert.deepEqual(r.rezultate, [{ id: "1", stare: "ok", motiv: "NFLX adăugat" }]);
  assert.deepEqual(r.lista[0], { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix Inc.", qty: 14.43412, pretMediu: 79.84, de: "2026-04-21", plata: "EUR" });
  r = aplicaCereriSalt(r.lista, [{ id: "2", op: "pune", isin: "US64110L1061", qty: 15, pretMediu: 89, moneda: "USD" }], UNIV);
  assert.equal(r.lista.length, 1); assert.equal(r.lista[0].qty, 15); assert.equal(r.lista[0].plata, "simbol"); assert.equal(r.rezultate[0].motiv, "NFLX modificat");
  r = aplicaCereriSalt(r.lista, [{ id: "3", op: "scoate", isin: "US64110L1061" }], UNIV);
  assert.equal(r.lista.length, 0); assert.equal(r.rezultate[0].stare, "ok");
});
await test("aplicaCereriSalt: respinge USD la acțiune în EUR, simbol necunoscut, cantitate ≤ 0, scoate ce nu e în listă - lista rămâne neatinsă", () => {
  const l0 = [{ isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall AG", qty: 1.0456, pretMediu: 1349.6, de: "2026-05-11", plata: "EUR" }];
  const r = aplicaCereriSalt(l0, [
    { id: "a", op: "pune", simbol: "RHM.DE", qty: 1, pretMediu: 1000, moneda: "USD" },
    { id: "b", op: "pune", simbol: "XYZQ", qty: 1, pretMediu: 10, moneda: "EUR" },
    { id: "c", op: "pune", simbol: "NFLX", qty: 0, pretMediu: 10, moneda: "EUR" },
    { id: "d", op: "scoate", isin: "US64110L1061" }], UNIV);
  assert.deepEqual(r.lista, l0);
  assert.deepEqual(r.rezultate.map((x) => x.stare), ["respins", "respins", "respins", "respins"]);
  assert.match(r.rezultate[0].motiv, /RHM\.DE se tranzacționează în EUR/); assert.match(r.rezultate[1].motiv, /nu e în lista Salt/);
  assert.match(r.rezultate[2].motiv, /bucăți/); assert.match(r.rezultate[3].motiv, /nu e în pozițiile tale/);
});
console.log(`\n${teste - picate}/${teste} probe trec`); if (picate) process.exit(1);
